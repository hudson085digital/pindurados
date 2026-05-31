import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { DeleteSaleUseCase } from '../delete-sale'

export function makeDeleteSaleUseCase() {
  return new DeleteSaleUseCase(new PrismaSalesRepository())
}
