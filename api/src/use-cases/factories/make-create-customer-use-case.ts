import { PrismaCustomersRepository } from '@/repositories/prisma/prisma-customers-repository'
import { CreateCustomerUseCase } from '../create-customer'

export function makeCreateCustomerUseCase() {
  return new CreateCustomerUseCase(new PrismaCustomersRepository())
}
