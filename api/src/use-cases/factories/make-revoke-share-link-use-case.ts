import { PrismaShareLinksRepository } from '@/repositories/prisma/prisma-share-links-repository'
import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { RevokeShareLinkUseCase } from '../revoke-share-link'

export function makeRevokeShareLinkUseCase() {
  return new RevokeShareLinkUseCase(
    new PrismaShareLinksRepository(),
    new PrismaSalesRepository(),
  )
}
