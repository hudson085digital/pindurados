// Monta o TEXTO da mensagem de cobrança (puro, testável). Ver spec 004.

export type PixKeyType = 'RANDOM' | 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE'

export interface ChargeMessagePixKey {
  type: PixKeyType
  key: string
  bankName: string
  holderName: string
}

export interface ChargeMessageInstallment {
  number: number
  effectiveInCents: number
  dueDate: Date
  overdue: boolean
  isLate: boolean
  lateInterestInCents: number
}

export interface ChargeMessageInput {
  customerName: string
  saleDescription?: string | null
  balanceInCents: number
  settled: boolean
  nextInstallment?: ChargeMessageInstallment | null
  pixKey?: ChargeMessagePixKey | null
}

const PIX_TYPE_LABEL: Record<PixKeyType, string> = {
  RANDOM: 'aleatória',
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  EMAIL: 'e-mail',
  PHONE: 'telefone',
}

function brl(cents: number): string {
  const negative = cents < 0
  const abs = Math.abs(cents)
  const intPart = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decPart = String(abs % 100).padStart(2, '0')
  return `${negative ? '-' : ''}R$ ${intPart},${decPart}`
}

function ddmmyyyy(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, '0')
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${date.getUTCFullYear()}`
}

export function buildChargeMessage(input: ChargeMessageInput): string {
  const lines: string[] = []

  lines.push(`Olá, ${input.customerName}! 👋`)

  const desc = input.saleDescription ? ` (${input.saleDescription})` : ''
  lines.push(`Passando para lembrar do seu crediário${desc}.`)
  lines.push('')

  if (input.settled || !input.nextInstallment) {
    lines.push('Está tudo quitado por aqui. Obrigado! ✅')
  } else {
    const inst = input.nextInstallment
    const venc = inst.overdue ? ` (vencida em ${ddmmyyyy(inst.dueDate)})` : ` — vence ${ddmmyyyy(inst.dueDate)}`
    lines.push(`Próxima parcela: ${inst.number}ª de ${brl(inst.effectiveInCents)}${venc}.`)
    if (inst.isLate && inst.lateInterestInCents > 0) {
      lines.push(`Já com multa/juros de atraso de ${brl(inst.lateInterestInCents)}.`)
    }
    lines.push(`Saldo devedor: ${brl(input.balanceInCents)}.`)
  }

  lines.push('')

  if (input.pixKey) {
    lines.push(`Pix (${PIX_TYPE_LABEL[input.pixKey.type]}): ${input.pixKey.key}`)
    lines.push(`Banco: ${input.pixKey.bankName} — ${input.pixKey.holderName}`)
    lines.push('')
  }

  lines.push('_Mensagem automática do sistema Pindurados._')

  return lines.join('\n')
}

// Monta o link wa.me a partir de um telefone livre (assume +55 se não houver DDI).
export function buildWhatsappUrl(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (!digits.startsWith('55')) digits = `55${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
