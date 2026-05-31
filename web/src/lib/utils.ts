import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Converte centavos (Int do back) em string "R$ 1.234,56"
export function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// "2026-05-31..." -> "31/05/2026"
export function formatDate(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

// "R$ 1.234,56" digitado -> centavos
export function reaisToCents(value: string | number) {
  if (typeof value === 'number') return Math.round(value * 100)
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')
  return Math.round((Number(normalized) || 0) * 100)
}

// "YYYY-MM-DD" + N meses, preservando o dia (31 ajusta em mês curto).
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate()
  const day = String(Math.min(d, lastDay)).padStart(2, '0')
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-${day}`
}

// "YYYY-MM-DD" -> "DD/MM/YYYY"
export function isoToBR(iso: string): string {
  return iso.split('-').reverse().join('/')
}
