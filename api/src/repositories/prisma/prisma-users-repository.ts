import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { UsersRepository } from '../users-repository'

export class PrismaUsersRepository implements UsersRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data })
  }
}
