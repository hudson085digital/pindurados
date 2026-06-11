import { PrismaShareLinksRepository } from '@/repositories/prisma/prisma-share-links-repository'
import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { CreateShareLinkUseCase } from '../create-share-link'

export function makeCreateShareLinkUseCase() {
  return new CreateShareLinkUseCase(
    new PrismaShareLinksRepository(),
    new PrismaSalesRepository(),
  )
}
