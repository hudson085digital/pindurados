import { PrismaCustomersRepository } from '@/repositories/prisma/prisma-customers-repository'
import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { GetCustomerDetailsUseCase } from '../get-customer-details'

export function makeGetCustomerDetailsUseCase() {
  return new GetCustomerDetailsUseCase(
    new PrismaCustomersRepository(),
    new PrismaSalesRepository(),
  )
}
