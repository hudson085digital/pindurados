// Máscaras de input para telefone e moeda (BR).

// "11990001234" -> "(11) 99000-1234" (formata progressivamente enquanto digita)
export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Dígitos digitados são tratados como centavos: "123450" -> 123450 (R$ 1.234,50)
export function digitsToCents(value: string): number {
  const digits = value.replace(/\D/g, '')
  return Number(digits || 0)
}

// 123450 -> "1.234,50" (para exibir no input, sem o "R$")
export function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
