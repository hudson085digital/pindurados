import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { SalesRepository, ReparcelarInstallment } from '../sales-repository'

const include = {
  customer: true,
  installments: {
    orderBy: { number: 'asc' },
  },
  receipts: {
    orderBy: { createdAt: 'asc' },
    include: { attachments: true },
  },
} satisfies Prisma.SaleInclude

export class PrismaSalesRepository implements SalesRepository {
  async create(data: Prisma.SaleCreateInput) {
    return prisma.sale.create({ data, include })
  }

  async findById(id: string) {
    return prisma.sale.findUnique({ where: { id }, include })
  }

  async findManyByCustomerId(customerId: string) {
    return prisma.sale.findMany({
      where: { customerId },
      include,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findManyByUserId(userId: string) {
    return prisma.sale.findMany({
      where: { customer: { userId } },
      include,
      orderBy: { createdAt: 'desc' },
    })
  }

  async update(id: string, data: Prisma.SaleUpdateInput) {
    return prisma.sale.update({ where: { id }, data, include })
  }

  async reparcelar(
    id: string,
    data: Prisma.SaleUpdateInput,
    installments: ReparcelarInstallment[],
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.installment.deleteMany({ where: { saleId: id } })
      return tx.sale.update({
        where: { id },
        data: { ...data, installments: { create: installments } },
        include,
      })
    })
  }

  async delete(id: string) {
    await prisma.sale.delete({ where: { id } })
  }
}
