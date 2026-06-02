import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ReceiptsRepository, AttachmentInput } from '../receipts-repository'

export class PrismaReceiptsRepository implements ReceiptsRepository {
  async create(data: Prisma.ReceiptUncheckedCreateInput, attachments?: AttachmentInput[]) {
    const receipt = await prisma.receipt.create({ data })
    if (attachments?.length) {
      await prisma.receiptAttachment.createMany({
        data: attachments.map((a) => ({
          receiptId: receipt.id,
          path: a.path,
          method: a.method ?? null,
        })),
      })
    }
    return receipt
  }

  async addAttachments(receiptId: string, attachments: AttachmentInput[]) {
    if (!attachments.length) return
    await prisma.receiptAttachment.createMany({
      data: attachments.map((a) => ({ receiptId, path: a.path, method: a.method ?? null })),
    })
  }

  async findById(id: string) {
    return prisma.receipt.findUnique({
      where: { id },
      include: { sale: { include: { customer: true } } },
    })
  }

  async update(id: string, data: Prisma.ReceiptUpdateInput) {
    return prisma.receipt.update({ where: { id }, data })
  }

  async findReversalOf(receiptId: string) {
    return prisma.receipt.findFirst({
      where: { reversesReceiptId: receiptId },
    })
  }
}
