import { ShareLinksRepository } from '@/repositories/share-links-repository'
import { SalesRepository } from '@/repositories/sales-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

export type ShareLinkStatus = 'active' | 'revoked' | 'expired'

interface GetShareLinkUseCaseRequest {
  userId: string
  saleId: string
}

interface GetShareLinkUseCaseResponse {
  exists: boolean
  token?: string
  status?: ShareLinkStatus
  expiresAt?: Date | null
}

export class GetShareLinkUseCase {
  constructor(
    private shareLinksRepository: ShareLinksRepository,
    private salesRepository: SalesRepository,
  ) {}

  async execute({
    userId,
    saleId,
  }: GetShareLinkUseCaseRequest): Promise<GetShareLinkUseCaseResponse> {
    const sale = await this.salesRepository.findById(saleId)
    if (!sale || sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Venda')
    }

    const link = await this.shareLinksRepository.findBySaleId(saleId)
    if (!link) {
      return { exists: false }
    }

    let status: ShareLinkStatus = 'active'
    if (link.revoked) {
      status = 'revoked'
    } else if (link.expiresAt != null && link.expiresAt.getTime() <= Date.now()) {
      status = 'expired'
    }

    return { exists: true, token: link.token, status, expiresAt: link.expiresAt }
  }
}
