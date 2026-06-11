import { ShareLinksRepository } from '@/repositories/share-links-repository'
import { SalesRepository } from '@/repositories/sales-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface RevokeShareLinkUseCaseRequest {
  userId: string
  saleId: string
}

export class RevokeShareLinkUseCase {
  constructor(
    private shareLinksRepository: ShareLinksRepository,
    private salesRepository: SalesRepository,
  ) {}

  async execute({ userId, saleId }: RevokeShareLinkUseCaseRequest): Promise<void> {
    const sale = await this.salesRepository.findById(saleId)
    if (!sale || sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Venda')
    }

    await this.shareLinksRepository.revoke(saleId)
  }
}
