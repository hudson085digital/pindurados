import { SalesRepository } from '@/repositories/sales-repository'
import { serializeSale, SerializedSale } from '@/utils/serialize-sale'
import { isoToDate } from '@/utils/add-months'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

interface UpdateSaleUseCaseRequest {
  userId: string
  saleId: string
  description?: string | null
  productCostInCents?: number
  /** "YYYY-MM-DD" */
  saleDate?: string
}

interface UpdateSaleUseCaseResponse {
  sale: SerializedSale
}

// Edita campos não-estruturais de uma venda (spec 007): descrição, custo e data.
// Não mexe em parcelas/recebimentos.
export class UpdateSaleUseCase {
  constructor(private salesRepository: SalesRepository) {}

  async execute({
    userId,
    saleId,
    description,
    productCostInCents,
    saleDate,
  }: UpdateSaleUseCaseRequest): Promise<UpdateSaleUseCaseResponse> {
    const sale = await this.salesRepository.findById(saleId)
    if (!sale || sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Venda')
    }

    if (productCostInCents !== undefined && productCostInCents < 0) {
      throw new BusinessRuleError('O custo não pode ser negativo.')
    }

    const updated = await this.salesRepository.update(saleId, {
      ...(description !== undefined ? { description } : {}),
      ...(productCostInCents !== undefined ? { productCostInCents } : {}),
      ...(saleDate !== undefined ? { saleDate: isoToDate(saleDate) } : {}),
    })

    return { sale: serializeSale(updated) }
  }
}
