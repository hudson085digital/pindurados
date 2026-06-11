import { PrismaShareLinksRepository } from '@/repositories/prisma/prisma-share-links-repository'
import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { PrismaPixKeysRepository } from '@/repositories/prisma/prisma-pix-keys-repository'
import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'
import { GetPublicSaleUseCase } from '../get-public-sale'

export function makeGetPublicSaleUseCase() {
  return new GetPublicSaleUseCase(
    new PrismaShareLinksRepository(),
    new PrismaSalesRepository(),
    new PrismaPixKeysRepository(),
    new PrismaUsersRepository(),
  )
}
