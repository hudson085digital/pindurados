// Formatação/datas vêm da fonte única compartilhada (@pindurados/core).
export {
  formatCurrency,
  formatDate,
  reaisToCents,
  isoToBR,
  formatPhone,
  digitsToCents,
  centsToDisplay,
} from '@pindurados/core'

// Máscara de data (UI): dígitos -> "dd/mm/aaaa" progressivo. O RN não tem
// <input type=date>, então editamos datas como texto mascarado.
export function maskDateBR(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

// "31/05/2026" -> "2026-05-31" (ISO de calendário). Retorna null se inválida.
export function brToISO(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  const day = Number(dd)
  const month = Number(mm)
  const year = Number(yyyy)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  // Valida o dia real do mês (ex.: 31/02 é inválido).
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null
  return `${yyyy}-${mm}-${dd}`
}

// "2026-05-31..." -> "31/05/2026" (para semear o input a partir do ISO salvo).
export function isoToBRDate(iso: string): string {
  return iso.slice(0, 10).split('-').reverse().join('/')
}
