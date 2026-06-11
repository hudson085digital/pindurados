import { Prisma, User } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { UsersRepository } from '../users-repository'

// Implementação em memória — usada nos testes, sem precisar de banco.
export class InMemoryUsersRepository implements UsersRepository {
  public items: User[] = []

  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null
  }

  async findByEmail(email: string) {
    return this.items.find((item) => item.email === email) ?? null
  }

  async create(data: Prisma.UserCreateInput) {
    const user: User = {
      id: data.id ?? randomUUID(),
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role ?? 'ADMIN',
      contactPhone: (data.contactPhone as string | null | undefined) ?? null,
      createdAt: new Date(),
    }
    this.items.push(user)
    return user
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    const user = this.items.find((item) => item.id === id)
    if (!user) throw new Error('User not found')
    if (data.name !== undefined) user.name = data.name as string
    if (data.contactPhone !== undefined) {
      user.contactPhone = data.contactPhone as string | null
    }
    return user
  }
}
