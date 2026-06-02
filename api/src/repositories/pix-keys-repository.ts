import { PixKey, Prisma } from '@prisma/client'

export interface PixKeysRepository {
  create(data: Prisma.PixKeyUncheckedCreateInput): Promise<PixKey>
  findById(id: string): Promise<PixKey | null>
  findManyByUserId(userId: string): Promise<PixKey[]>
  findDefaultByUserId(userId: string): Promise<PixKey | null>
  save(pixKey: PixKey): Promise<PixKey>
  delete(id: string): Promise<void>
  /** Tira o "padrão" de todas as chaves do usuário. */
  clearDefault(userId: string): Promise<void>
}
