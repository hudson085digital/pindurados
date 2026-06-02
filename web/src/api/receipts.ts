import { api } from '@/lib/axios'
import { ReceiptMethod } from './types'

export interface CreateReceiptBody {
  saleId: string
  amountInCents: number
  method: ReceiptMethod
  receivedAt?: string
  note?: string
}

export async function createReceipt({
  saleId,
  amountInCents,
  method,
  receivedAt,
  note,
}: CreateReceiptBody) {
  await api.post(`/sales/${saleId}/receipts`, {
    amountInCents,
    method,
    receivedAt,
    note,
  })
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
