import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { PrismaPurchasesRepository } from '@/repositories/prisma/prisma-purchases-repository'
import { GetDashboardUseCase } from '../get-dashboard'

export function makeGetDashboardUseCase() {
  return new GetDashboardUseCase(
    new PrismaSalesRepository(),
    new PrismaPurchasesRepository(),
  )
}
