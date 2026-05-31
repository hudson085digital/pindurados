import { SalesRepository } from '@/repositories/sales-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface DeleteSaleUseCaseRequest {
  userId: string
  saleId: string
}

export class DeleteSaleUseCase {
  constructor(private salesRepository: SalesRepository) {}

  async execute({ userId, saleId }: DeleteSaleUseCaseRequest): Promise<void> {
    const sale = await this.salesRepository.findById(saleId)
    if (!sale || sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Venda')
    }

    await this.salesRepository.delete(saleId)
  }
}
