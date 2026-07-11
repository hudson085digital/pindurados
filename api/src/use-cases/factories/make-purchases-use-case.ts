import { PrismaProductsRepository } from '@/repositories/prisma/prisma-products-repository'
import { PrismaPurchasesRepository } from '@/repositories/prisma/prisma-purchases-repository'
import { PrismaStockUnitsRepository } from '@/repositories/prisma/prisma-stock-units-repository'
import { ManagePurchasesUseCase } from '../manage-purchases'
import { ImportPurchasesUseCase } from '../import-purchases'
import { prisma } from '@/lib/prisma'

export function makePurchasesUseCase() {
  return new ManagePurchasesUseCase(
    new PrismaPurchasesRepository(),
    new PrismaStockUnitsRepository(),
    new PrismaProductsRepository(),
    { create: (data) => prisma.walletEntry.create({ data }) },
  )
}

export function makeImportPurchasesUseCase() {
  return new ImportPurchasesUseCase(
    makePurchasesUseCase(),
    new PrismaProductsRepository(),
  )
}
