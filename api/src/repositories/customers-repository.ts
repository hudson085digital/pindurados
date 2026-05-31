import { Customer, Prisma } from '@prisma/client'

export interface CustomersRepository {
  findById(id: string): Promise<Customer | null>
  findManyByUserId(userId: string): Promise<Customer[]>
  create(data: Prisma.CustomerUncheckedCreateInput): Promise<Customer>
  save(customer: Customer): Promise<Customer>
  delete(id: string): Promise<void>
}
