import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { GetDashboardUseCase } from '../get-dashboard'

export function makeGetDashboardUseCase() {
  return new GetDashboardUseCase(new PrismaSalesRepository())
}
