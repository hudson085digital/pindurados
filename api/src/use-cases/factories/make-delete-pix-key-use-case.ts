import { PrismaPixKeysRepository } from '@/repositories/prisma/prisma-pix-keys-repository'
import { DeletePixKeyUseCase } from '../delete-pix-key'

export function makeDeletePixKeyUseCase() {
  return new DeletePixKeyUseCase(new PrismaPixKeysRepository())
}
