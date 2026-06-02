import { PrismaPixKeysRepository } from '@/repositories/prisma/prisma-pix-keys-repository'
import { CreatePixKeyUseCase } from '../create-pix-key'

export function makeCreatePixKeyUseCase() {
  return new CreatePixKeyUseCase(new PrismaPixKeysRepository())
}
