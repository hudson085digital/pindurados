import { PrismaInstallmentsRepository } from '@/repositories/prisma/prisma-installments-repository'
import { UpdateInstallmentDueDateUseCase } from '../update-installment-due-date'

export function makeUpdateInstallmentDueDateUseCase() {
  return new UpdateInstallmentDueDateUseCase(new PrismaInstallmentsRepository())
}
