import { api } from '@/lib/axios'
import { ReceiptMethod } from './types'

export interface CreateReceiptBody {
  saleId: string
  amountInCents: number
  method: ReceiptMethod
  comprovante: File
  receivedAt?: string
  note?: string
}

export async function createReceipt({
  saleId,
  amountInCents,
  method,
  comprovante,
  receivedAt,
  note,
}: CreateReceiptBody) {
  const form = new FormData()
  form.append('amountInCents', String(amountInCents))
  form.append('method', method)
  form.append('comprovante', comprovante)
  if (receivedAt) form.append('receivedAt', receivedAt)
  if (note) form.append('note', note)

  await api.post(`/sales/${saleId}/receipts`, form)
}

export async function voidReceipt({
  saleId,
  receiptId,
}: {
  saleId: string
  receiptId: string
}) {
  await api.post(`/sales/${saleId}/receipts/${receiptId}/void`)
}
