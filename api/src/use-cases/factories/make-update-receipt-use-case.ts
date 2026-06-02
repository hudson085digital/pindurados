import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { PrismaReceiptsRepository } from '@/repositories/prisma/prisma-receipts-repository'
import { UpdateReceiptUseCase } from '../update-receipt'

export function makeUpdateReceiptUseCase() {
  return new UpdateReceiptUseCase(
    new PrismaSalesRepository(),
    new PrismaReceiptsRepository(),
  )
}
