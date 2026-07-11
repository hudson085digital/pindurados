import { ReceiptMethod } from '@prisma/client'
import { CustomersRepository } from '@/repositories/customers-repository'
import { SalesRepository, SaleWithDetails } from '@/repositories/sales-repository'
import { StockUnitsRepository } from '@/repositories/stock-units-repository'
import { ReceiptsRepository } from '@/repositories/receipts-repository'
import { serializeSale, SerializedSale } from '@/utils/serialize-sale'
import { calculateSale, SaleType } from './calculate-sale'
import { resolveMethodAmounts } from './create-receipt'
import { addMonthsISO, isoToDate, toISODate } from '@/utils/add-months'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

// 025 — item de venda: unidade do estoque com preço praticado e desconto.
export interface SaleItemInput {
  unitId: string
  priceInCents: number
  discountInCents?: number
  /** Permite vender unidade ainda AWAITING (venda antecipada). */
  allowAwaiting?: boolean
}

interface CreateSaleUseCaseRequest {
  userId: string
  customerId: string
  type: SaleType
  description?: string | null
  /** Com itens, pode ser omitido: assume a soma dos itens. */
  productValueInCents?: number
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
  /** 025 — unidades do estoque vendidas nesta venda (opcional). */
  items?: SaleItemInput[]
  origin?: string | null
  deliveryType?: string | null
  /** Tipo de venda (À vista/Cartão/Promissória — label configurável). */
  saleKind?: string | null
  /** Tipo de cliente NESTA venda (Varejo/Revenda). */
  customerKind?: string | null
  /** Venda de quitação imediata (à vista/cartão): formas do recebimento
   *  automático. Força 1 parcela sem juros e cria o recebimento na hora. */
  immediateMethods?: ReceiptMethod[]
  /** Valor por forma (alinhado a immediateMethods); obrigatório com 2+ formas
   *  e a soma deve fechar o total exato da venda. */
  immediateMethodAmounts?: number[]
}

interface CreateSaleUseCaseResponse {
  sale: SerializedSale
}

export class CreateSaleUseCase {
  constructor(
    private customersRepository: CustomersRepository,
    private salesRepository: SalesRepository,
    // Opcional para compatibilidade: sem repo de unidades, itens não são aceitos.
    private stockUnitsRepository?: StockUnitsRepository,
    // Opcional: necessário para vendas de quitação imediata (à vista/cartão).
    private receiptsRepository?: ReceiptsRepository,
  ) {}

  async execute(
    request: CreateSaleUseCaseRequest,
  ): Promise<CreateSaleUseCaseResponse> {
    const customer = await this.customersRepository.findById(request.customerId)
    if (!customer || customer.userId !== request.userId) {
      throw new ResourceNotFoundError('Devedor')
    }

    const saleISO = request.saleDate ?? toISODate(new Date())

    // 025 — valida e prepara os itens do estoque (o "plug" no fiado):
    // productValue e productCost derivam dos itens quando não informados.
    const items = request.items ?? []
    let itemsValueInCents = 0
    let itemsCostInCents = 0
    const itemCreates: {
      unitId: string
      nameSnapshot: string
      priceInCents: number
      discountInCents: number
      costSnapshotInCents: number
      warrantyDays: number | null
      warrantyUntil: Date | null
    }[] = []

    if (items.length > 0) {
      if (!this.stockUnitsRepository) {
        throw new BusinessRuleError('Itens de estoque não suportados aqui.')
      }
      const units = await this.stockUnitsRepository.findManyByIds(
        items.map((i) => i.unitId),
      )
      for (const item of items) {
        const unit = units.find((u) => u.id === item.unitId)
        if (!unit || unit.userId !== request.userId) {
          throw new ResourceNotFoundError('Unidade de estoque')
        }
        if (unit.status === 'SOLD') {
          throw new BusinessRuleError(
            `A unidade de "${unit.product.name}" já foi vendida.`,
          )
        }
        if (unit.status === 'AWAITING' && !item.allowAwaiting) {
          throw new BusinessRuleError(
            `A unidade de "${unit.product.name}" ainda não foi recebida. Marque "vender mesmo assim" para confirmar.`,
          )
        }
        const discount = item.discountInCents ?? 0
        if (discount > item.priceInCents) {
          throw new BusinessRuleError(
            'O desconto de um item não pode ser maior que o valor dele.',
          )
        }
        const warrantyDays = unit.product.warrantyDays ?? null
        const warrantyUntil = warrantyDays
          ? (() => {
              const d = isoToDate(saleISO)
              d.setDate(d.getDate() + warrantyDays)
              return d
            })()
          : null

        itemsValueInCents += item.priceInCents - discount
        itemsCostInCents += unit.finalCostInCents
        itemCreates.push({
          unitId: unit.id,
          nameSnapshot: unit.product.name,
          priceInCents: item.priceInCents,
          discountInCents: discount,
          costSnapshotInCents: unit.finalCostInCents,
          warrantyDays,
          warrantyUntil,
        })
      }
    }

    const productValueInCents =
      request.productValueInCents ?? itemsValueInCents
    if (!productValueInCents) {
      throw new BusinessRuleError('Informe o valor do produto ou adicione itens.')
    }

    // Quitação imediata (à vista/cartão): 1 parcela, sem juros, vence hoje.
    const immediate = (request.immediateMethods?.length ?? 0) > 0

    const calc = calculateSale({
      type: immediate ? 'MANUAL' : request.type,
      productValueInCents,
      downPaymentInCents: immediate ? 0 : request.downPaymentInCents,
      interestPercent: immediate ? 0 : request.interestPercent,
      installmentsCount: immediate ? 1 : request.installmentsCount,
      targetTotalInCents: immediate ? undefined : request.targetTotalInCents,
      customInstallmentValuesInCents: immediate
        ? undefined
        : request.customInstallmentValuesInCents,
    })

    // 1ª parcela: imediata vence no dia; senão informada ou 1 mês após a venda.
    const firstDueISO = immediate
      ? saleISO
      : (request.firstDueDate ?? addMonthsISO(saleISO, 1))
    const lateFeePercent = request.lateFeePercent ?? 25

    // Sem descrição livre: compõe dos itens do catálogo (fica nas mensagens
    // de cobrança e na página pública).
    const description =
      request.description ??
      (itemCreates.length > 0
        ? itemCreates.map((i) => i.nameSnapshot).join(', ')
        : null)

    const sale: SaleWithDetails = await this.salesRepository.create({
      description,
      type: request.type,
      productValueInCents: calc.productValueInCents,
      // custo: informado manualmente (>0) OU derivado das unidades vendidas
      productCostInCents:
        request.productCostInCents && request.productCostInCents > 0
          ? request.productCostInCents
          : itemsCostInCents,
      downPaymentInCents: calc.downPaymentInCents,
      interestPercent: calc.interestPercent,
      lateFeePercent,
      totalInCents: calc.totalInCents,
      saleDate: isoToDate(saleISO),
      origin: request.origin ?? null,
      deliveryType: request.deliveryType ?? null,
      saleKind: request.saleKind ?? null,
      customerKind: request.customerKind ?? customer.kind ?? null,
      customer: { connect: { id: request.customerId } },
      installments: {
        create: calc.installmentValuesInCents.map((amountInCents, index) => ({
          number: index + 1,
          amountInCents,
          // cada parcela: mesmo dia do mês, somando `index` meses à 1ª.
          dueDate: isoToDate(addMonthsISO(firstDueISO, index)),
        })),
      },
      ...(itemCreates.length > 0
        ? {
            items: {
              create: itemCreates.map((item) => ({
                nameSnapshot: item.nameSnapshot,
                priceInCents: item.priceInCents,
                discountInCents: item.discountInCents,
                costSnapshotInCents: item.costSnapshotInCents,
                warrantyDays: item.warrantyDays,
                warrantyUntil: item.warrantyUntil,
                unit: { connect: { id: item.unitId } },
              })),
            },
          }
        : {}),
    })

    // marca as unidades como vendidas (devolvidas se a venda for excluída)
    if (itemCreates.length > 0 && this.stockUnitsRepository) {
      await this.stockUnitsRepository.updateManyStatus(
        itemCreates.map((i) => i.unitId),
        'SOLD',
      )
    }

    // Quitação imediata: registra o recebimento total na hora (sem comprovante
    // — aparece no alerta de pendência até anexar a foto, como no fiado).
    if (immediate && this.receiptsRepository) {
      const methods = request.immediateMethods!
      // com 2+ formas, valida os valores por forma (devem somar o total exato)
      const methodAmountsInCents = resolveMethodAmounts(
        methods,
        calc.totalInCents,
        request.immediateMethodAmounts,
      )
      await this.receiptsRepository.create({
        saleId: sale.id,
        amountInCents: calc.totalInCents,
        methods,
        methodAmountsInCents,
        receivedAt: isoToDate(saleISO),
        note: null,
        createdBy: request.userId,
      })
      const fresh = await this.salesRepository.findById(sale.id)
      return { sale: serializeSale(fresh ?? sale) }
    }

    return { sale: serializeSale(sale) }
  }
}
