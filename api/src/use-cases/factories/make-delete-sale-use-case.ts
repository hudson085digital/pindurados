import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { PrismaStockUnitsRepository } from '@/repositories/prisma/prisma-stock-units-repository'
import { DeleteSaleUseCase } from '../delete-sale'

export function makeDeleteSaleUseCase() {
  return new DeleteSaleUseCase(
    new PrismaSalesRepository(),
    new PrismaStockUnitsRepository(),
  )
}
