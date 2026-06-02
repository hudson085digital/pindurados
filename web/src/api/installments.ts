import { api } from '@/lib/axios'

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

export async function updateInstallmentDueDate(installmentId: string, dueDate: string) {
  await api.patch(`/installments/${installmentId}/due-date`, { dueDate })
}
