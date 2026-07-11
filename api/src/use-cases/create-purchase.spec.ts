import { beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { InMemoryPurchasesRepository } from '@/repositories/in-memory/in-memory-purchases-repository'
import { InMemoryStockUnitsRepository } from '@/repositories/in-memory/in-memory-stock-units-repository'
import { InMemoryProductsRepository } from '@/repositories/in-memory/in-memory-products-repository'
import { ManagePurchasesUseCase } from './manage-purchases'
import { BusinessRuleError } from './errors/business-rule-error'

const userId = randomUUID()

let products: InMemoryProductsRepository
let stockUnits: InMemoryStockUnitsRepository
let purchases: InMemoryPurchasesRepository
let sut: ManagePurchasesUseCase
let productId: string

beforeEach(async () => {
  products = new InMemoryProductsRepository()
  stockUnits = new InMemoryStockUnitsRepository()
  purchases = new InMemoryPurchasesRepository(stockUnits)
  sut = new ManagePurchasesUseCase(purchases, stockUnits, products)

  const product = await products.create({ userId, name: 'JBL Boombox 4 Preta' })
  productId = product.id
  purchases.seedProduct(product)
})

describe('ManagePurchasesUseCase', () => {
  it('cria compra com N unidades AWAITING e custo unitário distribuído', async () => {
    const { purchase } = await sut.create(userId, {
      productId,
      date: '2026-04-01',
      quantity: 3,
      unitValueInCents: 7697,
      freightInCents: 2,
    })

    expect(purchase.units).toHaveLength(3)
    expect(purchase.units.every((u) => u.status === 'AWAITING')).toBe(true)
    const costs = purchase.units.map((u) => u.finalCostInCents).sort()
    expect(costs.reduce((s, c) => s + c, 0)).toBe(23093)
    expect(purchase.paidWithFreightInCents).toBe(23093)
  })

  it('compra MILES calcula o esperado e o custo final da planilha', async () => {
    const { purchase } = await sut.create(userId, {
      productId,
      date: '2026-03-07',
      unitValueInCents: 257630,
      format: 'MILES',
      accrualPerReal: 6,
      cpmInCents: 2700,
    })

    expect(purchase.expectedCreditInCents).toBe(41736)
    expect(purchase.finalCostInCents).toBe(215894)
    expect(purchase.units[0].finalCostInCents).toBe(215894)
  })

  it('cashback: custo fica o original e o crédito confirmado vai à carteira', async () => {
    const wallet: Record<string, unknown>[] = []
    const sutComCarteira = new ManagePurchasesUseCase(purchases, stockUnits, products, {
      create: async (data) => {
        wallet.push(data)
        return data
      },
    })

    const { purchase } = await sutComCarteira.create(userId, {
      productId,
      date: '2026-03-07',
      unitValueInCents: 100000,
      format: 'CASHBACK',
      cashbackPercent: 10,
    })
    // custo NÃO desconta o cashback
    expect(purchase.units[0].finalCostInCents).toBe(100000)

    const { purchase: updated } = await sutComCarteira.confirmCredit(
      userId,
      purchase.id,
      '2026-04-07',
      8000, // caiu menos que os R$ 100,00 esperados
    )

    expect(updated.creditStatus).toBe('CREDITED')
    // custo permanece o original; o valor entrou na carteira
    const unit = stockUnits.items.find((u) => u.purchaseId === purchase.id)
    expect(unit?.finalCostInCents).toBe(100000)
    expect(wallet).toHaveLength(1)
    expect(wallet[0]).toMatchObject({ amountInCents: 8000, kind: 'Cashback' })

    // idempotente: confirmar de novo não duplica o lançamento
    await sutComCarteira.confirmCredit(userId, purchase.id, '2026-04-08', 8000)
    expect(wallet).toHaveLength(1)
  })

  it('receber produto muda unidades para AVAILABLE com dados da peça', async () => {
    const { purchase } = await sut.create(userId, {
      productId,
      date: '2026-06-01',
      unitValueInCents: 186898,
    })
    const unitId = purchase.units[0].id

    await sut.receiveProduct(userId, purchase.id, '2026-06-09', [
      { unitId, serialNumber: 'HA0030-DQ0016078', danfe: '3526...1226' },
    ])

    const unit = await stockUnits.findById(unitId)
    expect(unit?.status).toBe('AVAILABLE')
    expect(unit?.serialNumber).toBe('HA0030-DQ0016078')
  })

  it('cancelar compra remove unidades não vendidas', async () => {
    const { purchase } = await sut.create(userId, {
      productId,
      date: '2026-06-01',
      quantity: 2,
      unitValueInCents: 50000,
    })

    await sut.cancel(userId, purchase.id)

    expect(stockUnits.items.filter((u) => u.purchaseId === purchase.id)).toHaveLength(0)
    expect((await purchases.findById(purchase.id))?.canceled).toBe(true)
  })

  it('bloqueia cancelamento quando há unidade vendida', async () => {
    const { purchase } = await sut.create(userId, {
      productId,
      date: '2026-06-01',
      unitValueInCents: 50000,
    })
    // simula unidade vendida
    const stored = await purchases.findById(purchase.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stored!.units[0].saleItem = { id: randomUUID() } as any

    await expect(sut.cancel(userId, purchase.id)).rejects.toBeInstanceOf(
      BusinessRuleError,
    )
  })

  it('lista com filtro de mês soma o investimento (pago com frete)', async () => {
    await sut.create(userId, { productId, date: '2026-01-06', unitValueInCents: 469900, freightInCents: 990 })
    await sut.create(userId, { productId, date: '2026-01-06', unitValueInCents: 261252 })
    await sut.create(userId, { productId, date: '2026-02-02', unitValueInCents: 176588 })

    const jan = await sut.list(userId, { month: '2026-01' })
    expect(jan.purchases).toHaveLength(2)
    expect(jan.investedInCents).toBe(470890 + 261252)
  })
})
