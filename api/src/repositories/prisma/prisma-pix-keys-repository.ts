import { PixKey, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PixKeysRepository } from '../pix-keys-repository'

export class PrismaPixKeysRepository implements PixKeysRepository {
  async create(data: Prisma.PixKeyUncheckedCreateInput) {
    return prisma.pixKey.create({ data })
  }

  async findById(id: string) {
    return prisma.pixKey.findUnique({ where: { id } })
  }

  async findManyByUserId(userId: string) {
    return prisma.pixKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findDefaultByUserId(userId: string) {
    return prisma.pixKey.findFirst({ where: { userId, isDefault: true } })
  }

  async save(pixKey: PixKey) {
    return prisma.pixKey.update({ where: { id: pixKey.id }, data: pixKey })
  }

  async delete(id: string) {
    await prisma.pixKey.delete({ where: { id } })
  }

  async clearDefault(userId: string) {
    await prisma.pixKey.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    })
  }
}
