// Mensagem de cobrança (porta fiel de api/src/utils/build-charge-message.ts),
// adaptada para datas ISO (string) e consumindo a venda já derivada.
import { formatCurrency, isoToBR } from '@pindurados/core'
import type { DerivedSale, PixKey, Customer } from './model'
import type { PixKeyType } from '@pindurados/core'

const PIX_TYPE_LABEL: Record<PixKeyType, string> = {
  RANDOM: 'aleatória',
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  EMAIL: 'e-mail',
  PHONE: 'telefone',
}

export function buildSaleChargeMessage(
  sale: DerivedSale,
  customer: Pick<Customer, 'name'>,
  pixKey: PixKey | null,
): string {
  const lines: string[] = []
  lines.push(`Olá, ${customer.name}! 👋`)
  const desc = sale.description ? ` (${sale.description})` : ''
  lines.push(`Passando para lembrar do seu crediário${desc}.`)
  lines.push('')

  const next = sale.installments.find((i) => i.status !== 'PAID')

  if (sale.settled || !next) {
    lines.push('Está tudo quitado por aqui. Obrigado! ✅')
  } else {
    const venc = next.overdue
      ? ` (vencida em ${isoToBR(next.dueDate)})`
      : ` — vence ${isoToBR(next.dueDate)}`
    lines.push(`Próxima parcela: ${next.number}ª de ${formatCurrency(next.effectiveInCents)}${venc}.`)
    if (next.isLate && next.lateInterestInCents > 0) {
      lines.push(`Já com multa/juros de atraso de ${formatCurrency(next.lateInterestInCents)}.`)
    }
    lines.push(`Saldo devedor: ${formatCurrency(sale.balanceInCents)}.`)
  }

  lines.push('')
  if (pixKey) {
    lines.push(`Pix (${PIX_TYPE_LABEL[pixKey.type]}): ${pixKey.key}`)
    lines.push(`Banco: ${pixKey.bankName} — ${pixKey.holderName}`)
    lines.push('')
  }
  lines.push('_Mensagem automática do sistema Pindurados._')
  return lines.join('\n')
}

// Link wa.me (assume +55 se não houver DDI).
export function buildWhatsappUrl(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (!digits.startsWith('55')) digits = `55${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
