import { CustomersRepository } from '@/repositories/customers-repository'
import { SalesRepository, SaleWithDetails } from '@/repositories/sales-repository'
import { serializeSale, SerializedSale } from '@/utils/serialize-sale'
import { calculateSale, SaleType } from './calculate-sale'
import { addMonthsISO, isoToDate, toISODate } from '@/utils/add-months'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface CreateSaleUseCaseRequest {
  userId: string
  customerId: string
  type: SaleType
  description?: string | null
  productValueInCents: number
  productCostInCents?: number
  downPaymentInCents?: number
  interestPercent?: number
  installmentsCount?: number
  targetTotalInCents?: number
  customInstallmentValuesInCents?: number[]
  lateFeePercent?: number
  /** Data da venda (início), "YYYY-MM-DD". */
  saleDate?: string
  /** Data da 1ª parcela, "YYYY-MM-DD". As demais caem no mesmo dia dos meses
   *  seguintes. Se omitida, usa 1 mês após a venda. */
  firstDueDate?: string
}

interface CreateSaleUseCaseResponse {
  sale: SerializedSale
}

export class CreateSaleUseCase {
  constructor(
    private customersRepository: CustomersRepository,
    private salesRepository: SalesRepository,
  ) {}

  async execute(
    request: CreateSaleUseCaseRequest,
  ): Promise<CreateSaleUseCaseResponse> {
    const customer = await this.customersRepository.findById(request.customerId)
    if (!customer || customer.userId !== request.userId) {
      throw new ResourceNotFoundError('Devedor')
    }

    const calc = calculateSale({
      type: request.type,
      productValueInCents: request.productValueInCents,
      downPaymentInCents: request.downPaymentInCents,
      interestPercent: request.interestPercent,
      installmentsCount: request.installmentsCount,
      targetTotalInCents: request.targetTotalInCents,
      customInstallmentValuesInCents: request.customInstallmentValuesInCents,
    })

    const saleISO = request.saleDate ?? toISODate(new Date())
    // 1ª parcela: informada pelo usuário ou, por padrão, 1 mês após a venda.
    const firstDueISO = request.firstDueDate ?? addMonthsISO(saleISO, 1)
    const lateFeePercent = request.lateFeePercent ?? 25

    const sale: SaleWithDetails = await this.salesRepository.create({
      description: request.description ?? null,
      type: request.type,
      productValueInCents: calc.productValueInCents,
      productCostInCents: request.productCostInCents ?? 0,
      downPaymentInCents: calc.downPaymentInCents,
      interestPercent: calc.interestPercent,
      lateFeePercent,
      totalInCents: calc.totalInCents,
      saleDate: isoToDate(saleISO),
      customer: { connect: { id: request.customerId } },
      installments: {
        create: calc.installmentValuesInCents.map((amountInCents, index) => ({
          number: index + 1,
          amountInCents,
          // cada parcela: mesmo dia do mês, somando `index` meses à 1ª.
          dueDate: isoToDate(addMonthsISO(firstDueISO, index)),
        })),
      },
    })

    return { sale: serializeSale(sale) }
  }
}
