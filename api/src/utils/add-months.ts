// Utilidades de data trabalhando com strings "YYYY-MM-DD" para evitar problemas
// de fuso horário (datas só de calendário, sem hora).

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// "YYYY-MM-DD" -> "YYYY-MM-DD" somando `months`, preservando o dia quando
// possível (dia 31 em mês curto cai no último dia: 31/05 -> 30/06 -> 31/07).
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1 + months, 1))
  const year = base.getUTCFullYear()
  const month = base.getUTCMonth()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(d, lastDay)
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

// Date (ou agora) -> "YYYY-MM-DD" pela data UTC (estável).
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// "YYYY-MM-DD" -> Date no meio-dia UTC, para a data exibida não "escorregar".
export function isoToDate(iso: string): Date {
  return new Date(`${iso}T12:00:00.000Z`)
}
