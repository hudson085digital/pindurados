import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Helper de classes Tailwind (web-only — depende de clsx/tailwind-merge).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatação de moeda/datas e parsing vêm da fonte única compartilhada.
export { formatCurrency, formatDate, reaisToCents, addMonthsISO, isoToBR } from '@pindurados/core'
