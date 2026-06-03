import { describe, it, expect } from 'vitest'
import { Installment, Receipt } from '@prisma/client'
import { InMemorySalesRepository } from '@/repositories/in-memory/in-memory-sales-repository'
import { serializeSale } from './serialize-sale'

function inst(number: number, amountInCents: number): Installment {
  return {
    id: `p${number}`,
    number,
    amountInCents,
    dueDate: new Date('2030-01-01'), // futuro: nunca "vencida"
    isLate: false,
    lateInterestInCents: 0,
    lateFeePercent: null,
    lateReason: null,
    saleId: 'sale-1',
  }
}

function receipt(amountInCents: number, createdAt: Date) {
  return {
    id: `r-${createdAt.getTime()}-${amountInCents}`,
    amountInCents,
    methods: ['PIX'] as Receipt['methods'],
    methodAmountsInCents: [] as number[],
    receivedAt: createdAt,
    note: null,
    receiptPath: null,
    reversesReceiptId: null,
    createdBy: null,
    createdAt,
    saleId: 'sale-1',
    attachments: [] as never[],
  }
}

describe('serializeSale', () => {
  it('lucro previsto = entrada + total − custo (sem entrada)', () => {
    const sale = InMemorySalesRepository.makeSale({
      id: 'sale-1',
      productCostInCents: 60000,
      totalInCents: 100000,
      installments: [inst(1, 100000)],
    })
    const s = serializeSale(sale)
    expect(s.profitInCents).toBe(40000)
  })

  it('lucro previsto inclui a entrada (entrada conta como receita)', () => {
    // Cenário do print: produto 2600, entrada 1300, restante 1300 + 50% juros = 1950,
    // custo 2300. Lucro = 1300 (entrada) + 1950 (total) − 2300 (custo) = 950.
    const sale = InMemorySalesRepository.makeSale({
      id: 'sale-1',
      productValueInCents: 260000,
      downPaymentInCents: 130000,
      productCostInCents: 230000,
      totalInCents: 195000,
      installments: [inst(1, 39000), inst(2, 39000), inst(3, 39000), inst(4, 39000), inst(5, 39000)],
    })
    const s = serializeSale(sale)
    expect(s.profitInCents).toBe(95000)
  })

  it('deriva status/saldo das parcelas a partir dos recebimentos (em ordem)', () => {
    const sale = InMemorySalesRepository.makeSale({
      id: 'sale-1',
      totalInCents: 100000,
      installments: [inst(1, 33333), inst(2, 33333), inst(3, 33334)],
      receipts: [receipt(50000, new Date('2026-02-01'))],
    })
    const s = serializeSale(sale)
    expect(s.installments[0].status).toBe('PAID')
    expect(s.installments[1].status).toBe('PARTIAL')
    expect(s.installments[2].status).toBe('OPEN')
    expect(s.balanceInCents).toBe(50000)
    expect(s.settled).toBe(false)
  })

  it('venda quitada fica settled', () => {
    const sale = InMemorySalesRepository.makeSale({
      id: 'sale-1',
      installments: [inst(1, 100000)],
      receipts: [receipt(100000, new Date('2026-02-01'))],
    })
    expect(serializeSale(sale).settled).toBe(true)
  })
})
