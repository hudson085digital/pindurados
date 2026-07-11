import { PrismaUserOptionsRepository } from '@/repositories/prisma/prisma-user-options-repository'
import { ManageUserOptionsUseCase } from '../manage-user-options'

export function makeUserOptionsUseCase() {
  return new ManageUserOptionsUseCase(new PrismaUserOptionsRepository())
}
