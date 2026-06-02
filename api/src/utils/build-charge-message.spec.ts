import { describe, it, expect } from 'vitest'
import { buildChargeMessage, buildWhatsappUrl } from './build-charge-message'

const base = {
  customerName: 'João',
  saleDescription: 'Geladeira',
  balanceInCents: 50000,
  settled: false,
  nextInstallment: {
    number: 2,
    effectiveInCents: 33333,
    dueDate: new Date('2026-07-10T00:00:00Z'),
    overdue: false,
    isLate: false,
    lateInterestInCents: 0,
  },
  pixKey: {
    type: 'CPF' as const,
    key: '000.000.000-00',
    bankName: 'Nubank',
    holderName: 'Hudson',
  },
}

describe('buildChargeMessage', () => {
  it('inclui valor, vencimento, saldo, Pix e o aviso de sistema', () => {
    const msg = buildChargeMessage(base)
    expect(msg).toContain('João')
    expect(msg).toContain('R$ 333,33')
    expect(msg).toContain('10/07/2026')
    expect(msg).toContain('Saldo devedor: R$ 500,00')
    expect(msg).toContain('Pix (CPF): 000.000.000-00')
    expect(msg).toContain('Nubank — Hudson')
    expect(msg).toContain('Mensagem automática do sistema Pindurados.')
  })

  it('quando em atraso, mostra a multa/juros', () => {
    const msg = buildChargeMessage({
      ...base,
      nextInstallment: { ...base.nextInstallment, overdue: true, isLate: true, lateInterestInCents: 8333 },
    })
    expect(msg).toContain('vencida em 10/07/2026')
    expect(msg).toContain('multa/juros de atraso de R$ 83,33')
  })

  it('formata milhares com ponto (R$ 1.000,00)', () => {
    const msg = buildChargeMessage({ ...base, balanceInCents: 100000 })
    expect(msg).toContain('Saldo devedor: R$ 1.000,00')
  })

  it('sem chave Pix, omite a linha do Pix', () => {
    const msg = buildChargeMessage({ ...base, pixKey: null })
    expect(msg).not.toContain('Pix (')
  })

  it('venda quitada informa que está em dia', () => {
    const msg = buildChargeMessage({ ...base, settled: true, nextInstallment: null })
    expect(msg).toContain('tudo quitado')
  })
})

describe('buildWhatsappUrl', () => {
  it('monta wa.me com +55 e mensagem encodada', () => {
    const url = buildWhatsappUrl('(85) 99999-0000', 'Olá!')
    expect(url).toBe('https://wa.me/5585999990000?text=Ol%C3%A1!')
  })

  it('sem telefone, retorna null', () => {
    expect(buildWhatsappUrl(null, 'x')).toBeNull()
  })
})
