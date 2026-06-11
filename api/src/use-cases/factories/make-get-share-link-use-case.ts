import { PrismaShareLinksRepository } from '@/repositories/prisma/prisma-share-links-repository'
import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { GetShareLinkUseCase } from '../get-share-link'

export function makeGetShareLinkUseCase() {
  return new GetShareLinkUseCase(
    new PrismaShareLinksRepository(),
    new PrismaSalesRepository(),
  )
}
