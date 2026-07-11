import { PrismaCustomersRepository } from '@/repositories/prisma/prisma-customers-repository'
import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { PrismaStockUnitsRepository } from '@/repositories/prisma/prisma-stock-units-repository'
import { PrismaReceiptsRepository } from '@/repositories/prisma/prisma-receipts-repository'
import { CreateSaleUseCase } from '../create-sale'

export function makeCreateSaleUseCase() {
  return new CreateSaleUseCase(
    new PrismaCustomersRepository(),
    new PrismaSalesRepository(),
    new PrismaStockUnitsRepository(),
    new PrismaReceiptsRepository(),
  )
}
