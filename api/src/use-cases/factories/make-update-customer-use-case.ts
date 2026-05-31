import { PrismaCustomersRepository } from '@/repositories/prisma/prisma-customers-repository'
import { UpdateCustomerUseCase } from '../update-customer'

export function makeUpdateCustomerUseCase() {
  return new UpdateCustomerUseCase(new PrismaCustomersRepository())
}
