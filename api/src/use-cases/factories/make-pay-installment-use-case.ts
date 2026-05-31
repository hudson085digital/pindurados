import { PrismaInstallmentsRepository } from '@/repositories/prisma/prisma-installments-repository'
import { PayInstallmentUseCase } from '../pay-installment'

export function makePayInstallmentUseCase() {
  return new PayInstallmentUseCase(new PrismaInstallmentsRepository())
}
