import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ReceiptsRepository } from '../receipts-repository'

export class PrismaReceiptsRepository implements ReceiptsRepository {
  async create(data: Prisma.ReceiptUncheckedCreateInput) {
    return prisma.receipt.create({ data })
  }

  async findById(id: string) {
    return prisma.receipt.findUnique({
      where: { id },
      include: { sale: { include: { customer: true } } },
    })
  }

  async findReversalOf(receiptId: string) {
    return prisma.receipt.findFirst({
      where: { reversesReceiptId: receiptId },
    })
  }
}
