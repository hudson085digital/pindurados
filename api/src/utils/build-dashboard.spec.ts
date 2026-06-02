import { describe, it, expect } from 'vitest'
import { buildDashboard, DashSale } from './build-dashboard'

function sale(over: Partial<DashSale> = {}): DashSale {
  return {
    customer: { id: 'c1', name: 'Cliente' },
    balanceInCents: 0,
    totalDueInCents: 0,
    totalPaidInCents: 0,
    productCostInCents: 0,
    profitInCents: 0,
    receiptsPendingProof: 0,
    settled: false,
    installments: [],
    receipts: [],
    ...over,
  }
}

describe('buildDashboard', () => {
  it('agrega totais e clientes com dívida', () => {
    const d = buildDashboard([
      sale({ customer: { id: 'c1', name: 'Ana' }, totalDueInCents: 100000, totalPaidInCents: 30000, balanceInCents: 70000, productCostInCents: 60000, profitInCents: 40000 }),
      sale({ customer: { id: 'c2', name: 'Beto' }, totalDueInCents: 50000, totalPaidInCents: 50000, balanceInCents: 0, settled: true, productCostInCents: 20000, profitInCents: 30000 }),
    ])
    expect(d.totals.soldInCents).toBe(150000)
    expect(d.totals.receivedInCents).toBe(80000)
    expect(d.totals.toReceiveInCents).toBe(70000)
    expect(d.totals.costInCents).toBe(80000)
    expect(d.totals.profitInCents).toBe(70000)
    expect(d.totals.settledSalesCount).toBe(1)
    expect(d.totals.customersWithDebt).toBe(1)
    expect(d.topDebtors[0]).toEqual({ customerId: 'c1', name: 'Ana', balanceInCents: 70000 })
  })

  it('recebido por mês (líquido) em ordem', () => {
    const d = buildDashboard([
      sale({
        receipts: [
          { amountInCents: 30000, methods: ['PIX'], methodAmountsInCents: [], receivedAt: new Date('2026-03-10T12:00:00Z') },
          { amountInCents: 20000, methods: ['CASH'], methodAmountsInCents: [], receivedAt: new Date('2026-04-05T12:00:00Z') },
          { amountInCents: -10000, methods: ['PIX'], methodAmountsInCents: [], receivedAt: new Date('2026-04-20T12:00:00Z') },
        ],
      }),
    ])
    expect(d.receivedByMonth).toEqual([
      { month: '2026-03', amountInCents: 30000 },
      { month: '2026-04', amountInCents: 10000 },
    ])
  })

  it('por forma divide o valor entre formas combinadas; sem forma vira NONE', () => {
    const d = buildDashboard([
      sale({
        receipts: [
          { amountInCents: 10000, methods: ['PIX', 'CASH'], methodAmountsInCents: [], receivedAt: new Date('2026-03-10T12:00:00Z') },
          { amountInCents: 5000, methods: [], methodAmountsInCents: [], receivedAt: new Date('2026-03-11T12:00:00Z') },
        ],
      }),
    ])
    const map = Object.fromEntries(d.byMethod.map((m) => [m.method, m.amountInCents]))
    expect(map.PIX).toBe(5000)
    expect(map.CASH).toBe(5000)
    expect(map.NONE).toBe(5000)
  })

  it('por forma usa o valor real por forma quando informado', () => {
    const d = buildDashboard([
      sale({
        receipts: [
          { amountInCents: 10000, methods: ['PIX', 'CASH'], methodAmountsInCents: [7000, 3000], receivedAt: new Date('2026-03-10T12:00:00Z') },
        ],
      }),
    ])
    const map = Object.fromEntries(d.byMethod.map((m) => [m.method, m.amountInCents]))
    expect(map.PIX).toBe(7000)
    expect(map.CASH).toBe(3000)
  })

  it('upcoming lista parcelas não pagas em ordem de vencimento', () => {
    const d = buildDashboard([
      sale({
        customer: { id: 'c1', name: 'Ana' },
        installments: [
          { number: 1, dueDate: new Date('2026-05-01'), status: 'PAID', balanceInCents: 0, overdue: false, isLate: false },
          { number: 2, dueDate: new Date('2026-04-01'), status: 'OPEN', balanceInCents: 50000, overdue: true, isLate: false },
        ],
      }),
    ])
    expect(d.upcoming).toHaveLength(1)
    expect(d.upcoming[0].number).toBe(2)
    expect(d.upcoming[0].overdue).toBe(true)
  })
})
