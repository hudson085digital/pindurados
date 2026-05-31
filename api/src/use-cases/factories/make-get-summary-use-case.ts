import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { GetSummaryUseCase } from '../get-summary'

export function makeGetSummaryUseCase() {
  return new GetSummaryUseCase(new PrismaSalesRepository())
}
