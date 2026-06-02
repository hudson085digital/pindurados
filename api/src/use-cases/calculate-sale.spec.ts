import { describe, it, expect } from 'vitest'
import { calculateSale } from './calculate-sale'

describe('Calculadora de venda (juros)', () => {
  it('MANUAL: escolhe livremente parcelas e juros', () => {
    const r = calculateSale({
      type: 'MANUAL',
      productValueInCents: 80000,
      downPaymentInCents: 0,
      interestPercent: 10,
      installmentsCount: 4,
    })
    expect(r.totalInCents).toBe(88000)
    expect(r.installmentsCount).toBe(4)
    expect(r.installmentValuesInCents).toEqual([22000, 22000, 22000, 22000])
  })

  it('joga os centavos quebrados na última parcela', () => {
    const r = calculateSale({
      type: 'MANUAL',
      productValueInCents: 10000,
      downPaymentInCents: 0,
      interestPercent: 0,
      installmentsCount: 3,
    })
    // 10000 / 3 = 3333,33... => 3333, 3333, 3334
    expect(r.installmentValuesInCents).toEqual([3333, 3333, 3334])
    expect(r.installmentValuesInCents.reduce((a, b) => a + b, 0)).toBe(10000)
  })

  it('BY_TOTAL: produto 1900, valor final 2500 em 3x => juros ~31,58%', () => {
    const r = calculateSale({
      type: 'BY_TOTAL',
      productValueInCents: 190000,
      downPaymentInCents: 0,
      targetTotalInCents: 250000,
      installmentsCount: 3,
    })
    expect(r.totalInCents).toBe(250000)
    expect(r.installmentsCount).toBe(3)
    expect(r.interestPercent).toBeCloseTo(31.58, 1)
    // 250000 / 3 = 83333,33 => 83333, 83333, 83334
    expect(r.installmentValuesInCents).toEqual([83333, 83333, 83334])
  })

  it('custom: total 2500 dividido em 2x 1000 + 1x 500', () => {
    const r = calculateSale({
      type: 'MANUAL',
      productValueInCents: 200000,
      downPaymentInCents: 0,
      customInstallmentValuesInCents: [100000, 100000, 50000],
    })
    expect(r.custom).toBe(true)
    expect(r.totalInCents).toBe(250000)
    expect(r.installmentsCount).toBe(3)
    expect(r.installmentValuesInCents).toEqual([100000, 100000, 50000])
    // juros = (250000-200000)/200000 = 25%
    expect(r.interestPercent).toBe(25)
  })
})
