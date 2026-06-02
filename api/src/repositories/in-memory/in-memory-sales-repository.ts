import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import {
  SalesRepository,
  SaleWithDetails,
  ReparcelarInstallment,
} from '../sales-repository'

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

  async update(id: string, data: Prisma.SaleUpdateInput): Promise<SaleWithDetails> {
    const sale = this.items.find((s) => s.id === id)
    if (!sale) throw new Error('Sale not found')
    if (data.description !== undefined) sale.description = data.description as string | null
    if (data.productCostInCents !== undefined) {
      sale.productCostInCents = data.productCostInCents as number
    }
    if (data.saleDate !== undefined) sale.saleDate = new Date(data.saleDate as string)
    return sale
  }

  async reparcelar(
    id: string,
    data: Prisma.SaleUpdateInput,
    installments: ReparcelarInstallment[],
  ): Promise<SaleWithDetails> {
    const sale = this.items.find((s) => s.id === id)
    if (!sale) throw new Error('Sale not found')
    if (data.description !== undefined) sale.description = data.description as string | null
    if (data.productValueInCents !== undefined) sale.productValueInCents = data.productValueInCents as number
    if (data.productCostInCents !== undefined) sale.productCostInCents = data.productCostInCents as number
    if (data.downPaymentInCents !== undefined) sale.downPaymentInCents = data.downPaymentInCents as number
    if (data.interestPercent !== undefined) sale.interestPercent = data.interestPercent as number
    if (data.totalInCents !== undefined) sale.totalInCents = data.totalInCents as number
    if (data.saleDate !== undefined) sale.saleDate = new Date(data.saleDate as string)
    sale.installments = installments.map((inst) => ({
      id: randomUUID(),
      number: inst.number,
      amountInCents: inst.amountInCents,
      dueDate: inst.dueDate,
      isLate: false,
      lateInterestInCents: 0,
      lateFeePercent: null,
      lateReason: null,
      saleId: id,
    }))
    return sale
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
