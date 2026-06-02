import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { SalesRepository } from '../sales-repository'

const include = {
  customer: true,
  installments: {
    orderBy: { number: 'asc' },
  },
  receipts: {
    orderBy: { createdAt: 'asc' },
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

  async delete(id: string) {
    await prisma.sale.delete({ where: { id } })
  }
}
