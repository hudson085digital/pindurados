import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { PrismaReceiptsRepository } from '@/repositories/prisma/prisma-receipts-repository'
import { CreateReceiptUseCase } from '../create-receipt'

export function makeCreateReceiptUseCase() {
  return new CreateReceiptUseCase(
    new PrismaSalesRepository(),
    new PrismaReceiptsRepository(),
  )
}
