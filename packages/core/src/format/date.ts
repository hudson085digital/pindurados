// Formatação de datas (pt-BR), tratando ISO como data de calendário (UTC).

// "2026-05-31..." -> "31/05/2026"
export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

// "YYYY-MM-DD" -> "DD/MM/YYYY"
export function isoToBR(iso: string): string {
  return iso.split('-').reverse().join('/')
}
