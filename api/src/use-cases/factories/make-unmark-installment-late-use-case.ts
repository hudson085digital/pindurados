import { PrismaInstallmentsRepository } from '@/repositories/prisma/prisma-installments-repository'
import { UnmarkInstallmentLateUseCase } from '../unmark-installment-late'

export function makeUnmarkInstallmentLateUseCase() {
  return new UnmarkInstallmentLateUseCase(new PrismaInstallmentsRepository())
}
