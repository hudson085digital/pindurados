import { ShareLinksRepository } from '@/repositories/share-links-repository'
import { SalesRepository } from '@/repositories/sales-repository'
import { PixKeysRepository } from '@/repositories/pix-keys-repository'
import { UsersRepository } from '@/repositories/users-repository'
import { serializePublicSale, PublicSaleView } from '@/utils/serialize-public-sale'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface GetPublicSaleUseCaseRequest {
  token: string
}

interface GetPublicSaleUseCaseResponse {
  sale: PublicSaleView
}

export class GetPublicSaleUseCase {
  constructor(
    private shareLinksRepository: ShareLinksRepository,
    private salesRepository: SalesRepository,
    private pixKeysRepository: PixKeysRepository,
    private usersRepository: UsersRepository,
  ) {}

  async execute({
    token,
  }: GetPublicSaleUseCaseRequest): Promise<GetPublicSaleUseCaseResponse> {
    const link = await this.shareLinksRepository.findByToken(token)

    // Inválido (inexistente / revogado / expirado) → tratado como 404 genérico
    // pelo controller, sem revelar se a venda existe (FR-013/SC-004).
    const expired = link?.expiresAt != null && link.expiresAt.getTime() <= Date.now()
    if (!link || link.revoked || expired) {
      throw new ResourceNotFoundError('Link')
    }

    const sale = await this.salesRepository.findById(link.saleId)
    if (!sale) {
      throw new ResourceNotFoundError('Link')
    }

    const ownerId = sale.customer.userId
    const [pixKey, owner] = await Promise.all([
      this.pixKeysRepository.findDefaultByUserId(ownerId),
      this.usersRepository.findById(ownerId),
    ])

    const view = serializePublicSale(sale, {
      creditorName: owner?.name ?? 'Credor',
      pixKey,
      contactPhone: owner?.contactPhone,
    })

    return { sale: view }
  }
}
