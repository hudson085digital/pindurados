// Formatação de moeda (BRL) e parsing de reais ↔ centavos.

// Converte centavos (Int) em string "R$ 1.234,56".
export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// "R$ 1.234,56" digitado -> centavos.
export function reaisToCents(value: string | number): number {
  if (typeof value === 'number') return Math.round(value * 100)
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')
  return Math.round((Number(normalized) || 0) * 100)
}
