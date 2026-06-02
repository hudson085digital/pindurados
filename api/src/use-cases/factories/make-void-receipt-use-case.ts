import { PrismaReceiptsRepository } from '@/repositories/prisma/prisma-receipts-repository'
import { VoidReceiptUseCase } from '../void-receipt'

export function makeVoidReceiptUseCase() {
  return new VoidReceiptUseCase(new PrismaReceiptsRepository())
}
