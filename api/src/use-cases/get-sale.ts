import { SalesRepository } from '@/repositories/sales-repository'
import { serializeSale, SerializedSale } from '@/utils/serialize-sale'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface GetSaleUseCaseRequest {
  userId: string
  saleId: string
}

interface GetSaleUseCaseResponse {
  sale: SerializedSale
}

export class GetSaleUseCase {
  constructor(private salesRepository: SalesRepository) {}

  async execute({
    userId,
    saleId,
  }: GetSaleUseCaseRequest): Promise<GetSaleUseCaseResponse> {
    const sale = await this.salesRepository.findById(saleId)
    if (!sale || sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Venda')
    }

    return { sale: serializeSale(sale) }
  }
}
