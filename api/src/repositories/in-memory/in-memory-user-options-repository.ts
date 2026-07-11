import { Prisma, UserOption, UserOptionKind } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { UserOptionsRepository } from '../user-options-repository'

export class InMemoryUserOptionsRepository implements UserOptionsRepository {
  public items: UserOption[] = []

  async create(data: Prisma.UserOptionUncheckedCreateInput) {
    const option: UserOption = {
      id: data.id ?? randomUUID(),
      kind: data.kind,
      label: data.label,
      meta: data.meta ?? null,
      createdAt: new Date(),
      userId: data.userId,
    }
    this.items.push(option)
    return option
  }

  async createMany(data: Prisma.UserOptionUncheckedCreateInput[]) {
    for (const item of data) {
      const exists = this.items.some(
        (o) =>
          o.userId === item.userId &&
          o.kind === item.kind &&
          o.label === item.label,
      )
      if (!exists) await this.create(item)
    }
  }

  async findById(id: string) {
    return this.items.find((o) => o.id === id) ?? null
  }

  async findManyByUserId(userId: string, kind?: UserOptionKind) {
    return this.items
      .filter((o) => o.userId === userId && (!kind || o.kind === kind))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  async countByUserId(userId: string, kind: UserOptionKind) {
    return this.items.filter((o) => o.userId === userId && o.kind === kind).length
  }

  async delete(id: string) {
    this.items = this.items.filter((o) => o.id !== id)
  }
}
