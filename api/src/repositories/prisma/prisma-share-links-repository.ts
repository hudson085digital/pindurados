import { prisma } from '@/lib/prisma'
import { ShareLinksRepository } from '../share-links-repository'

export class PrismaShareLinksRepository implements ShareLinksRepository {
  async findByToken(token: string) {
    return prisma.saleShareLink.findUnique({ where: { token } })
  }

  async findBySaleId(saleId: string) {
    return prisma.saleShareLink.findUnique({ where: { saleId } })
  }

  async upsertForSale(saleId: string, token: string, expiresAt: Date | null) {
    return prisma.saleShareLink.upsert({
      where: { saleId },
      create: { saleId, token, expiresAt },
      update: { token, revoked: false, expiresAt },
    })
  }

  async revoke(saleId: string) {
    await prisma.saleShareLink.updateMany({
      where: { saleId },
      data: { revoked: true },
    })
  }
}
