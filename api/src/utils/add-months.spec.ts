import { describe, it, expect } from 'vitest'
import { addMonthsISO } from './add-months'

describe('addMonthsISO', () => {
  it('1ª parcela 31/05 gera 30/06, 31/07, 31/08 (dia 31 ajusta em mês curto)', () => {
    expect(addMonthsISO('2026-05-31', 0)).toBe('2026-05-31')
    expect(addMonthsISO('2026-05-31', 1)).toBe('2026-06-30')
    expect(addMonthsISO('2026-05-31', 2)).toBe('2026-07-31')
    expect(addMonthsISO('2026-05-31', 3)).toBe('2026-08-31')
  })

  it('vira o ano corretamente', () => {
    expect(addMonthsISO('2026-11-15', 3)).toBe('2027-02-15')
  })

  it('fevereiro: 31/01 -> 28/02 (ano não bissexto)', () => {
    expect(addMonthsISO('2026-01-31', 1)).toBe('2026-02-28')
  })
})
