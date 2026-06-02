import { api } from '@/lib/axios'
import { ReceiptMethod } from './types'

export interface CreateReceiptBody {
  saleId: string
  amountInCents: number
  methods: ReceiptMethod[]
  comprovante: File
  receivedAt?: string
  note?: string
}

export async function createReceipt({
  saleId,
  amountInCents,
  methods,
  comprovante,
  receivedAt,
  note,
}: CreateReceiptBody) {
  const form = new FormData()
  form.append('amountInCents', String(amountInCents))
  methods.forEach((m) => form.append('methods', m))
  form.append('comprovante', comprovante)
  if (receivedAt) form.append('receivedAt', receivedAt)
  if (note) form.append('note', note)

  await api.post(`/sales/${saleId}/receipts`, form)
}

export interface UpdateReceiptBody {
  saleId: string
  receiptId: string
  amountInCents?: number
  methods?: ReceiptMethod[]
  receivedAt?: string
  note?: string
  comprovante?: File | null
}

export async function updateReceipt({
  saleId,
  receiptId,
  amountInCents,
  methods,
  receivedAt,
  note,
  comprovante,
}: UpdateReceiptBody) {
  const form = new FormData()
  if (amountInCents !== undefined) form.append('amountInCents', String(amountInCents))
  // Envia "methods" mesmo vazio (string vazia) para sinalizar edição das formas.
  if (methods !== undefined) form.append('methods', methods.join(','))
  if (receivedAt) form.append('receivedAt', receivedAt)
  if (note !== undefined) form.append('note', note)
  if (comprovante) form.append('comprovante', comprovante)

  await api.put(`/sales/${saleId}/receipts/${receiptId}`, form)
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
