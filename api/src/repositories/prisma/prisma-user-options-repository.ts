import { Prisma, UserOptionKind } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { UserOptionsRepository } from '../user-options-repository'

export class PrismaUserOptionsRepository implements UserOptionsRepository {
  async create(data: Prisma.UserOptionUncheckedCreateInput) {
    return prisma.userOption.create({ data })
  }

  async createMany(data: Prisma.UserOptionUncheckedCreateInput[]) {
    await prisma.userOption.createMany({ data, skipDuplicates: true })
  }

  async findById(id: string) {
    return prisma.userOption.findUnique({ where: { id } })
  }

  async findManyByUserId(userId: string, kind?: UserOptionKind) {
    return prisma.userOption.findMany({
      where: { userId, ...(kind ? { kind } : {}) },
      orderBy: { label: 'asc' },
    })
  }

  async countByUserId(userId: string, kind: UserOptionKind) {
    return prisma.userOption.count({ where: { userId, kind } })
  }

  async update(id: string, data: { label?: string; meta?: string | null }) {
    return prisma.userOption.update({ where: { id }, data })
  }

  async delete(id: string) {
    await prisma.userOption.delete({ where: { id } })
  }
}
