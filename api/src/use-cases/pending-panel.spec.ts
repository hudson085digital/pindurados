import { beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { InMemoryPurchasesRepository } from '@/repositories/in-memory/in-memory-purchases-repository'
import { InMemoryStockUnitsRepository } from '@/repositories/in-memory/in-memory-stock-units-repository'
import { InMemoryProductsRepository } from '@/repositories/in-memory/in-memory-products-repository'
import { ManagePurchasesUseCase } from './manage-purchases'
import { GetPendingPanelUseCase } from './pending-panel'

const userId = randomUUID()

let purchases: InMemoryPurchasesRepository
let manage: ManagePurchasesUseCase
let sut: GetPendingPanelUseCase
let productId: string

beforeEach(async () => {
  const products = new InMemoryProductsRepository()
  const stockUnits = new InMemoryStockUnitsRepository()
  purchases = new InMemoryPurchasesRepository(stockUnits)
  manage = new ManagePurchasesUseCase(purchases, stockUnits, products)
  sut = new GetPendingPanelUseCase(purchases)

  const product = await products.create({ userId, name: 'JBL Boombox 4' })
  productId = product.id
  purchases.seedProduct(product)
})

describe('GetPendingPanelUseCase', () => {
  it('separa produtos pendentes e créditos pendentes, atrasados no topo', async () => {
    // pendente SEM atraso (previsão futura)
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)
    await manage.create(userId, {
      productId, date: '2026-07-01', unitValueInCents: 100000, productExpectedAt: future,
    })
    // pendente COM atraso (previsão passada)
    await manage.create(userId, {
      productId, date: '2026-06-01', unitValueInCents: 200000, productExpectedAt: '2026-06-10',
    })
    // recebido + crédito pendente atrasado (MILES)
    const { purchase: miles } = await manage.create(userId, {
      productId, date: '2026-03-07', unitValueInCents: 257630,
      format: 'MILES', accrualPerReal: 6, cpmInCents: 2700,
      creditExpectedAt: '2026-04-07',
    })
    await manage.receiveProduct(userId, miles.id, '2026-03-10')
    // cashback creditado (fica nas estatísticas, fora das pendências)
    const { purchase: cb } = await manage.create(userId, {
      productId, date: '2026-05-01', unitValueInCents: 100000,
      format: 'CASHBACK', cashbackPercent: 10,
    })
    await manage.receiveProduct(userId, cb.id, '2026-05-05')
    await manage.confirmCredit(userId, cb.id, '2026-05-20')

    const panel = await sut.execute(userId)

    expect(panel.stats.pendingProductsCount).toBe(2)
    expect(panel.stats.pendingProductsValueInCents).toBe(300000)
    expect(panel.stats.receivedCount).toBe(2)
    expect(panel.stats.pendingCreditsCount).toBe(1)
    expect(panel.stats.pendingCreditsValueInCents).toBe(41736)
    expect(panel.stats.creditedCount).toBe(1)
    expect(panel.stats.creditedValueInCents).toBe(10000)

    // atrasado primeiro
    expect(panel.products[0].valueInCents).toBe(200000)
    expect(panel.products[0].daysLate).toBeGreaterThan(0)
    expect(panel.products[1].daysLate).toBe(0)
    expect(panel.credits[0].purchaseId).toBe(miles.id)
    expect(panel.credits[0].daysLate).toBeGreaterThan(0)
  })

  it('compra cancelada não aparece nas pendências', async () => {
    const { purchase } = await manage.create(userId, {
      productId, date: '2026-06-01', unitValueInCents: 50000,
    })
    await manage.cancel(userId, purchase.id)

    const panel = await sut.execute(userId)
    expect(panel.products).toHaveLength(0)
    expect(panel.stats.pendingProductsCount).toBe(0)
  })
})
