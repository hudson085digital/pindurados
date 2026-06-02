import { PrismaPixKeysRepository } from '@/repositories/prisma/prisma-pix-keys-repository'
import { SetDefaultPixKeyUseCase } from '../set-default-pix-key'

export function makeSetDefaultPixKeyUseCase() {
  return new SetDefaultPixKeyUseCase(new PrismaPixKeysRepository())
}
