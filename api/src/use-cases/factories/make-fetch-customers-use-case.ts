import { PrismaCustomersRepository } from '@/repositories/prisma/prisma-customers-repository'
import { PrismaSalesRepository } from '@/repositories/prisma/prisma-sales-repository'
import { FetchCustomersUseCase } from '../fetch-customers'

export function makeFetchCustomersUseCase() {
  return new FetchCustomersUseCase(
    new PrismaCustomersRepository(),
    new PrismaSalesRepository(),
  )
}
