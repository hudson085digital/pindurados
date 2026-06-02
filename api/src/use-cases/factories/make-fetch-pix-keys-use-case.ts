import { PrismaPixKeysRepository } from '@/repositories/prisma/prisma-pix-keys-repository'
import { FetchPixKeysUseCase } from '../fetch-pix-keys'

export function makeFetchPixKeysUseCase() {
  return new FetchPixKeysUseCase(new PrismaPixKeysRepository())
}
