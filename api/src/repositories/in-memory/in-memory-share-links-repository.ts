import { SaleShareLink } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { ShareLinksRepository } from '../share-links-repository'

// Implementação em memória — usada nos testes, sem precisar de banco.
export class InMemoryShareLinksRepository implements ShareLinksRepository {
  public items: SaleShareLink[] = []

  async findByToken(token: string) {
    return this.items.find((l) => l.token === token) ?? null
  }

  async findBySaleId(saleId: string) {
    return this.items.find((l) => l.saleId === saleId) ?? null
  }

  async upsertForSale(saleId: string, token: string, expiresAt: Date | null) {
    const existing = this.items.find((l) => l.saleId === saleId)
    if (existing) {
      existing.token = token
      existing.revoked = false
      existing.expiresAt = expiresAt
      return existing
    }
    const link: SaleShareLink = {
      id: randomUUID(),
      token,
      revoked: false,
      expiresAt,
      createdAt: new Date(),
      saleId,
    }
    this.items.push(link)
    return link
  }

  async revoke(saleId: string) {
    const existing = this.items.find((l) => l.saleId === saleId)
    if (existing) existing.revoked = true
  }
}
