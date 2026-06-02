import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { UpdateSaleUseCase } from '../update-sale'

export function makeUpdateSaleUseCase() {
  return new UpdateSaleUseCase(new PrismaSalesRepository())
}
