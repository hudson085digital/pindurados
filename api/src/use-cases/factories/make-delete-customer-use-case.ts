import { PrismaCustomersRepository } from '@/repositories/prisma/prisma-customers-repository'
import { DeleteCustomerUseCase } from '../delete-customer'

export function makeDeleteCustomerUseCase() {
  return new DeleteCustomerUseCase(new PrismaCustomersRepository())
}
