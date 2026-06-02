import { api } from '@/lib/axios'
import { ReceiptMethod } from './types'

// Cada comprovante pode ser marcado (opcional) com a forma de pagamento.
export interface AttachmentUpload {
  file: File
  method?: ReceiptMethod | null
}

export interface CreateReceiptBody {
  saleId: string
  amountInCents: number
  methods: ReceiptMethod[]
  methodAmountsInCents?: number[]
  attachments: AttachmentUpload[]
  receivedAt?: string
  note?: string
}

function appendAttachments(form: FormData, attachments: AttachmentUpload[]) {
  attachments.forEach((a) => form.append('comprovante', a.file))
  form.append('comprovanteMethods', attachments.map((a) => a.method ?? '').join(','))
}

export async function createReceipt({
  saleId,
  amountInCents,
  methods,
  methodAmountsInCents,
  attachments,
  receivedAt,
  note,
}: CreateReceiptBody) {
  const form = new FormData()
  form.append('amountInCents', String(amountInCents))
  methods.forEach((m) => form.append('methods', m))
  if (methodAmountsInCents && methodAmountsInCents.length) {
    form.append('methodAmounts', methodAmountsInCents.join(','))
  }
  appendAttachments(form, attachments)
  if (receivedAt) form.append('receivedAt', receivedAt)
  if (note) form.append('note', note)

  await api.post(`/sales/${saleId}/receipts`, form)
}

export interface UpdateReceiptBody {
  saleId: string
  receiptId: string
  amountInCents?: number
  methods?: ReceiptMethod[]
  methodAmountsInCents?: number[]
  receivedAt?: string
  note?: string
  addAttachments?: AttachmentUpload[]
}

export async function updateReceipt({
  saleId,
  receiptId,
  amountInCents,
  methods,
  methodAmountsInCents,
  receivedAt,
  note,
  addAttachments,
}: UpdateReceiptBody) {
  const form = new FormData()
  if (amountInCents !== undefined) form.append('amountInCents', String(amountInCents))
  // Envia "methods" mesmo vazio (string vazia) para sinalizar edição das formas.
  if (methods !== undefined) form.append('methods', methods.join(','))
  if (methodAmountsInCents !== undefined) form.append('methodAmounts', methodAmountsInCents.join(','))
  if (receivedAt) form.append('receivedAt', receivedAt)
  if (note !== undefined) form.append('note', note)
  if (addAttachments && addAttachments.length) appendAttachments(form, addAttachments)

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
