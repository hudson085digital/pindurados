import { PrismaPurchasesRepository } from '@/repositories/prisma/prisma-purchases-repository'
import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { GetPendingPanelUseCase } from '../pending-panel'

export function makePendingPanelUseCase() {
  return new GetPendingPanelUseCase(
    new PrismaPurchasesRepository(),
    new PrismaSalesRepository(),
  )
}
