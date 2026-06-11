import { describe, it, expect } from 'vitest'
import {
  allocateReceipts,
  sumReceipts,
  type AllocatableInstallment,
} from '../src/calc/allocate-receipts'

// Crediário do exemplo da spec: 1000 em 3x (333,33 / 333,33 / 333,34), sem atraso.
const PARCELAS: AllocatableInstallment[] = [
  { amountInCents: 33333, isLate: false, lateInterestInCents: 0 },
  { amountInCents: 33333, isLate: false, lateInterestInCents: 0 },
  { amountInCents: 33334, isLate: false, lateInterestInCents: 0 },
]

describe('allocateReceipts — cascata da mais antiga para a mais nova', () => {
  it('paga 500 de 1000: quita a 1ª, parcial na 2ª, 3ª em aberto, saldo 500', () => {
    const r = allocateReceipts(PARCELAS, 50000)

    expect(r.installments[0].status).toBe('PAID')
    expect(r.installments[0].paidInCents).toBe(33333)
    expect(r.installments[0].balanceInCents).toBe(0)

    expect(r.installments[1].status).toBe('PARTIAL')
    expect(r.installments[1].paidInCents).toBe(16667)
    expect(r.installments[1].balanceInCents).toBe(16666)

    expect(r.installments[2].status).toBe('OPEN')
    expect(r.installments[2].paidInCents).toBe(0)

    expect(r.totalDueInCents).toBe(100000)
    expect(r.balanceInCents).toBe(50000)
  })

  it('sem recebimentos: tudo em aberto, saldo = total', () => {
    const r = allocateReceipts(PARCELAS, 0)
    expect(r.installments.every((i) => i.status === 'OPEN')).toBe(true)
    expect(r.balanceInCents).toBe(100000)
  })

  it('quita tudo: 1000 zera o saldo e todas ficam PAID', () => {
    const r = allocateReceipts(PARCELAS, 100000)
    expect(r.installments.every((i) => i.status === 'PAID')).toBe(true)
    expect(r.balanceInCents).toBe(0)
  })

  it('múltiplos recebimentos (300 + 200) equivalem a um de 500', () => {
    const um = allocateReceipts(PARCELAS, sumReceipts([{ amountInCents: 30000 }, { amountInCents: 20000 }]))
    const outro = allocateReceipts(PARCELAS, 50000)
    expect(um).toEqual(outro)
  })
})

describe('allocateReceipts — multa+juros antes do principal (Q1)', () => {
  const COM_ATRASO: AllocatableInstallment[] = [
    { amountInCents: 33333, isLate: true, lateInterestInCents: 10000 },
    { amountInCents: 33333, isLate: false, lateInterestInCents: 0 },
    { amountInCents: 33334, isLate: false, lateInterestInCents: 0 },
  ]

  it('paga 20000 na parcela em atraso: quita os 10000 de juros e 10000 do principal', () => {
    const r = allocateReceipts(COM_ATRASO, 20000)
    const p1 = r.installments[0]
    expect(p1.latePaidInCents).toBe(10000)
    expect(p1.principalPaidInCents).toBe(10000)
    expect(p1.status).toBe('PARTIAL')
    expect(p1.balanceInCents).toBe(43333 - 20000)
  })

  it('efetivo inclui multa+juros no total devido', () => {
    const r = allocateReceipts(COM_ATRASO, 0)
    expect(r.installments[0].effectiveInCents).toBe(43333)
    expect(r.totalDueInCents).toBe(43333 + 33333 + 33334)
  })
})

describe('allocateReceipts — estornos', () => {
  it('estorno (negativo) reduz o pool: 500 - 200 = 300 recebidos', () => {
    const total = sumReceipts([
      { amountInCents: 50000 },
      { amountInCents: -20000 }, // estorno
    ])
    expect(total).toBe(30000)

    const r = allocateReceipts(PARCELAS, total)
    expect(r.balanceInCents).toBe(70000)
    expect(r.installments[0].status).toBe('PARTIAL')
    expect(r.installments[0].paidInCents).toBe(30000)
    expect(r.installments[1].status).toBe('OPEN')
  })

  it('pool nunca fica negativo (clamp em zero)', () => {
    const r = allocateReceipts(PARCELAS, -5000)
    expect(r.installments.every((i) => i.paidInCents === 0)).toBe(true)
  })
})
