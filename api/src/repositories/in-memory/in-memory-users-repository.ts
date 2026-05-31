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
      createdAt: new Date(),
    }
    this.items.push(user)
    return user
  }
}
