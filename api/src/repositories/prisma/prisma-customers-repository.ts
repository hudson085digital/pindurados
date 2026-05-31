import { Customer, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { CustomersRepository } from '../customers-repository'

export class PrismaCustomersRepository implements CustomersRepository {
  async findById(id: string) {
    return prisma.customer.findUnique({ where: { id } })
  }

  async findManyByUserId(userId: string) {
    return prisma.customer.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    })
  }

  async create(data: Prisma.CustomerUncheckedCreateInput) {
    return prisma.customer.create({ data })
  }

  async save(customer: Customer) {
    return prisma.customer.update({
      where: { id: customer.id },
      data: customer,
    })
  }

  async delete(id: string) {
    await prisma.customer.delete({ where: { id } })
  }
}
