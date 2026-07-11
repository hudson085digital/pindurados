import { PrismaProductsRepository } from '@/repositories/prisma/prisma-products-repository'
import { ManageProductsUseCase } from '../manage-products'

export function makeProductsUseCase() {
  return new ManageProductsUseCase(new PrismaProductsRepository())
}
