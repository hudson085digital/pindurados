import { ShareLinksRepository } from '@/repositories/share-links-repository'
import { SalesRepository } from '@/repositories/sales-repository'
import { generateToken } from '@/utils/generate-token'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface CreateShareLinkUseCaseRequest {
  userId: string
  saleId: string
  expiresAt?: Date | null
}

interface CreateShareLinkUseCaseResponse {
  token: string
  status: 'active'
  expiresAt: Date | null
}

export class CreateShareLinkUseCase {
  constructor(
    private shareLinksRepository: ShareLinksRepository,
    private salesRepository: SalesRepository,
  ) {}

  async execute({
    userId,
    saleId,
    expiresAt = null,
  }: CreateShareLinkUseCaseRequest): Promise<CreateShareLinkUseCaseResponse> {
    const sale = await this.salesRepository.findById(saleId)
    if (!sale || sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Venda')
    }

    // Cria ou rotaciona: novo token, reativa (revoked=false), atualiza expiração.
    const link = await this.shareLinksRepository.upsertForSale(
      saleId,
      generateToken(),
      expiresAt,
    )

    return { token: link.token, status: 'active', expiresAt: link.expiresAt }
  }
}
