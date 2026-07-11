import { describe, expect, it } from 'vitest'
import { calculatePurchaseCost } from './purchase-cost'

// Casos reais extraídos da planilha "Compras de Produtos - Milhas - 2026.xlsx".
describe('calculatePurchaseCost', () => {
  it('formato NORMAL: custo = pago com frete (JBL Boombox 4, Shopee)', () => {
    const cost = calculatePurchaseCost({
      format: 'NORMAL',
      quantity: 1,
      unitValueInCents: 261252,
      freightInCents: 0,
    })
    expect(cost.finalCostInCents).toBe(261252)
    expect(cost.expectedCreditInCents).toBe(0)
    expect(cost.unitCostsInCents).toEqual([261252])
  })

  it('formato MILES: TV LG 55" — 2.576,30 · 6/real · CPM 27 → 2.158,94', () => {
    const cost = calculatePurchaseCost({
      format: 'MILES',
      quantity: 1,
      unitValueInCents: 257630,
      freightInCents: 0,
      accrualPerReal: 6,
      cpmInCents: 2700,
    })
    expect(cost.expectedMiles).toBeCloseTo(15457.8, 1)
    expect(cost.expectedCreditInCents).toBe(41736) // R$ 417,36
    expect(cost.finalCostInCents).toBe(215894) // R$ 2.158,94
  })

  it('formato MILES: JBL Boombox 4 — 2.558,99 · 7/real · CPM 27 → 2.075,34', () => {
    const cost = calculatePurchaseCost({
      format: 'MILES',
      quantity: 1,
      unitValueInCents: 255899,
      accrualPerReal: 7,
      cpmInCents: 2700,
    })
    expect(cost.expectedMiles).toBeCloseTo(17912.93, 1)
    expect(cost.expectedCreditInCents).toBe(48365) // R$ 483,65
    expect(cost.finalCostInCents).toBe(207534) // R$ 2.075,34
  })

  it('formato CASHBACK: custo = valor original; cashback esperado vai à carteira', () => {
    const cost = calculatePurchaseCost({
      format: 'CASHBACK',
      quantity: 1,
      unitValueInCents: 469900,
      freightInCents: 990,
      cashbackPercent: 13,
    })
    // esperado calculado (13% de 4.699,00) para a CARTEIRA…
    expect(cost.expectedCreditInCents).toBe(61087) // R$ 610,87
    expect(cost.paidWithFreightInCents).toBe(470890)
    // …mas o custo do produto NÃO desconta o cashback (demora a cair).
    expect(cost.finalCostInCents).toBe(470890)
  })

  it('crédito real substitui o esperado quando confirmado (milhas)', () => {
    const cost = calculatePurchaseCost({
      format: 'MILES',
      quantity: 1,
      unitValueInCents: 100000,
      accrualPerReal: 10,
      cpmInCents: 1000, // esperado: 10.000 milhas = R$ 100,00... = 10000 cents
      actualCreditInCents: 8000, // caiu menos que o esperado
    })
    expect(cost.expectedCreditInCents).toBe(10000)
    expect(cost.creditInCents).toBe(8000)
    expect(cost.finalCostInCents).toBe(92000)
  })

  it('antecipação Nubank aplica desconto sobre o custo final', () => {
    const cost = calculatePurchaseCost({
      format: 'NORMAL',
      quantity: 1,
      unitValueInCents: 289900, // JBL Boombox 4 Branca (fev)
      nubankAdvance: true,
      nubankDiscountPercent: 4.5,
    })
    expect(cost.finalCostNubankInCents).toBe(276855) // ≈ R$ 2.768,55
    expect(cost.effectiveFinalCostInCents).toBe(276855)
  })

  it('quantidade N divide o custo com a sobra de centavos na 1ª unidade', () => {
    const cost = calculatePurchaseCost({
      format: 'NORMAL',
      quantity: 3,
      unitValueInCents: 7697, // 3× Fonte Turbo Apple 20w
      freightInCents: 2, // força sobra: total 23.093
    })
    expect(cost.paidWithFreightInCents).toBe(23093)
    expect(cost.unitCostsInCents).toEqual([7699, 7697, 7697])
    expect(cost.unitCostsInCents.reduce((s, c) => s + c, 0)).toBe(23093)
  })
})
