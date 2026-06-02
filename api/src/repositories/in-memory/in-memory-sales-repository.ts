import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { SalesRepository, SaleWithDetails } from '../sales-repository'

// Implementação em memória — usada nos testes, sem precisar de banco.
// `items` guarda vendas já no formato detalhado (com customer/installments/receipts).
export class InMemorySalesRepository implements SalesRepository {
  public items: SaleWithDetails[] = []

  /** Atalho para os testes: insere uma venda detalhada pronta. */
  seed(sale: SaleWithDetails) {
    this.items.push(sale)
    return sale
  }

  async create(data: Prisma.SaleCreateInput): Promise<SaleWithDetails> {
    // Suporte mínimo para testes que criam venda direto (não exercitado pelos
    // use cases de recebimento, que usam seed()).
    const sale = data as unknown as SaleWithDetails
    this.items.push(sale)
    return sale
  }

  async findById(id: string) {
    return this.items.find((s) => s.id === id) ?? null
  }

  async findManyByCustomerId(customerId: string) {
    return this.items.filter((s) => s.customerId === customerId)
  }

  async findManyByUserId(userId: string) {
    return this.items.filter((s) => s.customer.userId === userId)
  }

  async delete(id: string) {
    this.items = this.items.filter((s) => s.id !== id)
  }

  // Helper de fábrica para montar uma venda de teste rapidamente.
  static makeSale(overrides: Partial<SaleWithDetails> = {}): SaleWithDetails {
    const id = overrides.id ?? randomUUID()
    const customerId = overrides.customerId ?? randomUUID()
    const userId = overrides.customer?.userId ?? randomUUID()

    return {
      id,
      description: 'Venda teste',
      type: 'MANUAL',
      productValueInCents: 100000,
      productCostInCents: 0,
      downPaymentInCents: 0,
      interestPercent: 0,
      lateFeePercent: 25,
      totalInCents: 100000,
      saleDate: new Date('2026-01-01'),
      createdAt: new Date('2026-01-01'),
      customerId,
      customer: {
        id: customerId,
        name: 'Cliente',
        phone: null,
        note: null,
        autoReminder: false,
        createdAt: new Date('2026-01-01'),
        userId,
      },
      installments: [],
      receipts: [],
      ...overrides,
    }
  }
}
