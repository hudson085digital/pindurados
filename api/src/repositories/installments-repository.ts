import { Installment, Prisma } from '@prisma/client'

export type InstallmentWithSale = Prisma.InstallmentGetPayload<{
  include: { sale: { include: { customer: true } } }
}>

export interface InstallmentsRepository {
  findById(id: string): Promise<InstallmentWithSale | null>
  save(installment: Installment): Promise<Installment>
  createPayment(data: Prisma.PaymentUncheckedCreateInput): Promise<void>
}
