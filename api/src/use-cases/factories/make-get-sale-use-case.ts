import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { GetSaleUseCase } from '../get-sale'

export function makeGetSaleUseCase() {
  return new GetSaleUseCase(new PrismaSalesRepository())
}
