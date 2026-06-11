import { describe, it, expect } from 'vitest'
import { Installment, Receipt } from '@prisma/client'
import { InMemorySalesRepository } from '@/repositories/in-memory/in-memory-sales-repository'
import { serializePublicSale } from './serialize-public-sale'

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

describe('serializePublicSale', () => {
  it('aplica whitelist: NÃO expõe custo/lucro nem ids internos', () => {
    const sale = InMemorySalesRepository.makeSale({
      id: 'sale-1',
      productValueInCents: 200000,
      productCostInCents: 150000, // dado sensível
      totalInCents: 100000,
      installments: [inst(1, 100000)],
    })

    const view = serializePublicSale(sale, { creditorName: 'Maria' })
    const keys = Object.keys(view)

    expect(keys).not.toContain('productCostInCents')
    expect(keys).not.toContain('profitInCents')
    expect(keys).not.toContain('productValueInCents')
    expect(keys).not.toContain('userId')
    expect(keys).not.toContain('customerId')
    expect(keys).not.toContain('id')
    // E garante que o valor sensível não vaza em nenhuma serialização.
    expect(JSON.stringify(view)).not.toContain('150000')
  })

  it('expõe os números derivados corretos (total, pago, saldo, status)', () => {
    const sale = InMemorySalesRepository.makeSale({
      id: 'sale-1',
      downPaymentInCents: 20000,
      totalInCents: 100000,
      installments: [inst(1, 33333), inst(2, 33333), inst(3, 33334)],
      receipts: [receipt(50000, new Date('2026-02-01'))],
    })

    const view = serializePublicSale(sale, { creditorName: 'Maria' })

    expect(view.customerName).toBe('Cliente')
    expect(view.creditorName).toBe('Maria')
    expect(view.totalInCents).toBe(100000)
    expect(view.downPaymentInCents).toBe(20000)
    expect(view.totalPaidInCents).toBe(50000)
    expect(view.balanceInCents).toBe(50000)
    expect(view.settled).toBe(false)
    expect(view.installments[0].status).toBe('PAID')
    expect(view.installments[1].status).toBe('PARTIAL')
    expect(view.installments[2].status).toBe('OPEN')
  })

  it('inclui PIX e contato só quando disponíveis', () => {
    const sale = InMemorySalesRepository.makeSale({
      id: 'sale-1',
      installments: [inst(1, 100000)],
    })

    const semExtras = serializePublicSale(sale, { creditorName: 'Maria' })
    expect(semExtras.pix).toBeUndefined()
    expect(semExtras.contact).toBeUndefined()

    const comExtras = serializePublicSale(sale, {
      creditorName: 'Maria',
      pixKey: { type: 'EMAIL', key: 'maria@x.com', holderName: 'Maria', bankName: 'Nubank' },
      contactPhone: '11999990000',
    })
    expect(comExtras.pix?.key).toBe('maria@x.com')
    expect(comExtras.contact?.phone).toBe('11999990000')
    expect(comExtras.contact?.whatsappUrl).toContain('wa.me/5511999990000')
  })
})
