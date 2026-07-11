import { Prisma, PurchaseFormat } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PurchaseFilters, PurchasesRepository } from '../purchases-repository'

const includeDetails = {
  product: true,
  units: { include: { saleItem: true } },
} satisfies Prisma.PurchaseInclude

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m, 1))
  return { gte: start, lt: end }
}

export class PrismaPurchasesRepository implements PurchasesRepository {
  async create(data: Prisma.PurchaseUncheckedCreateInput) {
    return prisma.purchase.create({ data, include: includeDetails })
  }

  async findById(id: string) {
    return prisma.purchase.findUnique({
      where: { id },
      include: includeDetails,
    })
  }

  async findManyByUserId(userId: string, filters: PurchaseFilters = {}) {
    return prisma.purchase.findMany({
      where: {
        userId,
        ...(filters.month ? { date: monthRange(filters.month) } : {}),
        ...(filters.marketplace ? { marketplace: filters.marketplace } : {}),
        ...(filters.format
          ? { format: filters.format as PurchaseFormat }
          : {}),
        ...(filters.productStatus === 'RECEIVED'
          ? { productReceivedAt: { not: null } }
          : {}),
        ...(filters.productStatus === 'NOT_RECEIVED'
          ? { productReceivedAt: null, canceled: false }
          : {}),
        ...(filters.creditStatus === 'CREDITED'
          ? { creditReceivedAt: { not: null } }
          : {}),
        ...(filters.creditStatus === 'NOT_CREDITED'
          ? {
              creditReceivedAt: null,
              canceled: false,
              format: { in: ['MILES', 'CASHBACK'] },
            }
          : {}),
        ...(filters.search
          ? {
              OR: [
                { orderNumber: { contains: filters.search, mode: 'insensitive' } },
                { account: { contains: filters.search, mode: 'insensitive' } },
                { note: { contains: filters.search, mode: 'insensitive' } },
                { product: { name: { contains: filters.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: includeDetails,
      orderBy: { date: 'desc' },
    })
  }

  async update(id: string, data: Prisma.PurchaseUpdateInput) {
    return prisma.purchase.update({
      where: { id },
      data,
      include: includeDetails,
    })
  }

  async cancel(id: string) {
    await prisma.$transaction([
      // remove só unidades não vendidas (as vendidas bloqueiam no use-case)
      prisma.stockUnit.deleteMany({
        where: { purchaseId: id, saleItem: null },
      }),
      prisma.purchase.update({ where: { id }, data: { canceled: true } }),
    ])
  }
}
