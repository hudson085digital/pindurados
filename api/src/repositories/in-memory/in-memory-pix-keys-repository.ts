import { PixKey, Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { PixKeysRepository } from '../pix-keys-repository'

export class InMemoryPixKeysRepository implements PixKeysRepository {
  public items: PixKey[] = []

  async create(data: Prisma.PixKeyUncheckedCreateInput) {
    const pixKey: PixKey = {
      id: data.id ?? randomUUID(),
      type: data.type,
      key: data.key,
      bankName: data.bankName,
      holderName: data.holderName,
      isDefault: data.isDefault ?? false,
      createdAt: new Date(),
      userId: data.userId,
    }
    this.items.push(pixKey)
    return pixKey
  }

  async findById(id: string) {
    return this.items.find((k) => k.id === id) ?? null
  }

  async findManyByUserId(userId: string) {
    return this.items
      .filter((k) => k.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  async findDefaultByUserId(userId: string) {
    return this.items.find((k) => k.userId === userId && k.isDefault) ?? null
  }

  async save(pixKey: PixKey) {
    const index = this.items.findIndex((k) => k.id === pixKey.id)
    if (index >= 0) this.items[index] = pixKey
    return pixKey
  }

  async delete(id: string) {
    this.items = this.items.filter((k) => k.id !== id)
  }

  async clearDefault(userId: string) {
    this.items.forEach((k) => {
      if (k.userId === userId) k.isDefault = false
    })
  }
}
