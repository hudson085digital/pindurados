import { describe, it, expect } from 'vitest'
import { redistribute } from '../src/calc/redistribute'

describe('redistribute', () => {
  it('distribui o alvo igualmente quando nada está fixado (sobra na última)', () => {
    const r = redistribute([0, 0, 0], [false, false, false], 100000)
    expect(r).toEqual([33333, 33333, 33334])
    expect(r.reduce((a, b) => a + b, 0)).toBe(100000)
  })

  it('mantém as parcelas fixadas e redistribui o restante nas não fixadas', () => {
    // fixa a 1ª em 50000; restante 50000 entre as outras duas
    const r = redistribute([50000, 0, 0], [true, false, false], 100000)
    expect(r[0]).toBe(50000)
    expect(r[1] + r[2]).toBe(50000)
    expect(r.reduce((a, b) => a + b, 0)).toBe(100000)
  })

  it('todas fixadas: retorna como está', () => {
    const r = redistribute([40000, 60000], [true, true], 100000)
    expect(r).toEqual([40000, 60000])
  })
})
