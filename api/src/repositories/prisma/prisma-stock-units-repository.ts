import { Prisma, StockUnitStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  StockUnitFilters,
  StockUnitsRepository,
} from '../stock-units-repository'

const includeDetails = {
  product: { include: { productType: { include: { fields: true } } } },
  purchase: true,
  saleItem: { include: { sale: { include: { customer: true } } } },
} satisfies Prisma.StockUnitInclude

export class PrismaStockUnitsRepository implements StockUnitsRepository {
  async findById(id: string) {
    return prisma.stockUnit.findUnique({
      where: { id },
      include: includeDetails,
    })
  }

  async findManyByIds(ids: string[]) {
    return prisma.stockUnit.findMany({
      where: { id: { in: ids } },
      include: includeDetails,
    })
  }

  async findManyByUserId(userId: string, filters: StockUnitFilters = {}) {
    return prisma.stockUnit.findMany({
      where: {
        userId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.productId ? { productId: filters.productId } : {}),
        ...(filters.search
          ? {
              OR: [
                { serialNumber: { contains: filters.search, mode: 'insensitive' } },
                { imei1: { contains: filters.search, mode: 'insensitive' } },
                { imei2: { contains: filters.search, mode: 'insensitive' } },
                { danfe: { contains: filters.search, mode: 'insensitive' } },
                { product: { name: { contains: filters.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: includeDetails,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findManyByPurchaseId(purchaseId: string) {
    return prisma.stockUnit.findMany({
      where: { purchaseId },
      include: includeDetails,
      orderBy: { createdAt: 'asc' },
    })
  }

  async update(id: string, data: Prisma.StockUnitUpdateInput) {
    return prisma.stockUnit.update({
      where: { id },
      data,
      include: includeDetails,
    })
  }

  async updateManyStatus(ids: string[], status: StockUnitStatus) {
    await prisma.stockUnit.updateMany({
      where: { id: { in: ids } },
      data: { status },
    })
  }
}
