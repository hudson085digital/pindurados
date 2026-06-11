// Editor de parcelas customizadas: distribui (target − fixadas) igualmente entre
// as parcelas NÃO fixadas, jogando os centavos quebrados na última. Mantém as
// fixadas como estão. (Espelha o redistribute() do web/new-sale.)

export function redistribute(
  cents: number[],
  pinned: boolean[],
  target: number,
): number[] {
  const autoIdx = cents.map((_, i) => i).filter((i) => !pinned[i])
  if (autoIdx.length === 0) return cents
  const pinnedSum = cents.reduce((s, c, i) => s + (pinned[i] ? c : 0), 0)
  const remaining = Math.max(0, target - pinnedSum)
  const base = Math.floor(remaining / autoIdx.length)
  const result = [...cents]
  autoIdx.forEach((idx, k) => {
    result[idx] = k === autoIdx.length - 1 ? remaining - base * (autoIdx.length - 1) : base
  })
  return result
}
