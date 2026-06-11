import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'
import { UpdateUserProfileUseCase } from '../update-user-profile'

export function makeUpdateUserProfileUseCase() {
  return new UpdateUserProfileUseCase(new PrismaUsersRepository())
}
