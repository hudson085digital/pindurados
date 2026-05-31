import { Installment, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { InstallmentsRepository } from '../installments-repository'

export class PrismaInstallmentsRepository implements InstallmentsRepository {
  async findById(id: string) {
    return prisma.installment.findUnique({
      where: { id },
      include: { sale: { include: { customer: true } } },
    })
  }

  async save(installment: Installment) {
    return prisma.installment.update({
      where: { id: installment.id },
      data: installment,
    })
  }

  async createPayment(data: Prisma.PaymentUncheckedCreateInput) {
    await prisma.payment.create({ data })
  }
}
