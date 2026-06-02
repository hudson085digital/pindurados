import { PrismaInstallmentsRepository } from '@/repositories/prisma/prisma-installments-repository'
import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { MarkInstallmentLateUseCase } from '../mark-installment-late'

export function makeMarkInstallmentLateUseCase() {
  return new MarkInstallmentLateUseCase(
    new PrismaInstallmentsRepository(),
    new PrismaSalesRepository(),
  )
}
