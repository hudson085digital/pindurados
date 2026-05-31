import { PrismaCustomersRepository } from '@/repositories/prisma/prisma-customers-repository'
import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { CreateSaleUseCase } from '../create-sale'

export function makeCreateSaleUseCase() {
  return new CreateSaleUseCase(
    new PrismaCustomersRepository(),
    new PrismaSalesRepository(),
  )
}
