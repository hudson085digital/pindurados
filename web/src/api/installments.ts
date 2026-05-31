import { api } from '@/lib/axios'

export interface PayInstallmentBody {
  installmentId: string
  amountInCents: number
  paidAt?: string
  comprovante?: File | null
}

export async function payInstallment({
  installmentId,
  amountInCents,
  paidAt,
  comprovante,
}: PayInstallmentBody) {
  const form = new FormData()
  form.append('amountInCents', String(amountInCents))
  if (paidAt) form.append('paidAt', paidAt)
  if (comprovante) form.append('comprovante', comprovante)

  await api.post(`/installments/${installmentId}/payments`, form)
}

export interface MarkLateBody {
  installmentId: string
  lateFeePercent?: number
  reason?: string
}

export async function markInstallmentLate({
  installmentId,
  lateFeePercent,
  reason,
}: MarkLateBody) {
  await api.post(`/installments/${installmentId}/late`, { lateFeePercent, reason })
}

export async function unmarkInstallmentLate(installmentId: string) {
  await api.delete(`/installments/${installmentId}/late`)
}
