import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ProductsRepository } from '../products-repository'

export class PrismaProductsRepository implements ProductsRepository {
  async create(data: Prisma.ProductUncheckedCreateInput) {
    return prisma.product.create({ data })
  }

  async findById(id: string) {
    return prisma.product.findUnique({ where: { id } })
  }

  async findManyByUserId(userId: string, search?: string) {
    return prisma.product.findMany({
      where: {
        userId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { brand: { contains: search, mode: 'insensitive' } },
                { color: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
                { productModel: { is: { name: { contains: search, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      include: {
        units: { select: { status: true } },
        productType: { include: { fields: true } },
        productModel: true,
      },
      orderBy: { name: 'asc' },
    })
  }

  async update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data })
  }

  async delete(id: string) {
    await prisma.product.delete({ where: { id } })
  }

  async countUnits(productId: string) {
    return prisma.stockUnit.count({ where: { productId } })
  }

  async countPurchases(productId: string) {
    return prisma.purchase.count({ where: { productId } })
  }
}
