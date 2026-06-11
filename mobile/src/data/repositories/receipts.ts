import { formatCurrency } from '@pindurados/core'
import { getDb } from '../db'
import { uuid, nowISO, todayISO } from '../ids'
import { getSaleDetail } from './sales'
import type { ReceiptMethod } from '../model'

export interface ReceiptAttachmentInput {
  path: string
  method: ReceiptMethod | null
  mime: string | null
}

export interface CreateReceiptInput {
  saleId: string
  amountInCents: number
  methods: ReceiptMethod[]
  methodAmountsInCents?: number[]
  receivedAt: string
  note?: string | null
  attachments: ReceiptAttachmentInput[]
}

export type RepoResult = { ok: true } | { ok: false; error: string }

export async function createReceipt(input: CreateReceiptInput): Promise<RepoResult> {
  if (input.amountInCents <= 0) return { ok: false, error: 'Informe um valor.' }

  const sale = await getSaleDetail(input.saleId)
  if (!sale) return { ok: false, error: 'Venda não encontrada.' }
  if (input.amountInCents > sale.balanceInCents) {
    return {
      ok: false,
      error: `Valor acima do saldo. Receba no máximo ${formatCurrency(sale.balanceInCents)}.`,
    }
  }

  let methodAmounts: number[] = []
  if (input.methods.length >= 2) {
    methodAmounts = input.methods.map((_, i) => input.methodAmountsInCents?.[i] ?? 0)
    if (methodAmounts.reduce((s, a) => s + a, 0) !== input.amountInCents) {
      return { ok: false, error: 'A soma dos valores por forma deve ser igual ao valor recebido.' }
    }
  }

  const db = await getDb()
  const receiptId = uuid()
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO receipts (id, sale_id, amount_in_cents, methods, method_amounts_in_cents,
        received_at, note, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        receiptId,
        input.saleId,
        input.amountInCents,
        JSON.stringify(input.methods),
        JSON.stringify(methodAmounts),
        input.receivedAt,
        input.note ?? null,
        nowISO(),
      ],
    )
    for (const a of input.attachments) {
      await db.runAsync(
        `INSERT INTO receipt_attachments (id, receipt_id, path, method, mime, created_at)
         VALUES (?,?,?,?,?,?)`,
        [uuid(), receiptId, a.path, a.method, a.mime, nowISO()],
      )
    }
  })
  return { ok: true }
}

// Estorno: novo evento negativo apontando ao recebimento original (ledger imutável).
export async function voidReceipt(saleId: string, receiptId: string): Promise<void> {
  const db = await getDb()
  const r = await db.getFirstAsync<{ amount_in_cents: number }>(
    'SELECT amount_in_cents FROM receipts WHERE id = ?',
    receiptId,
  )
  if (!r) return
  await db.runAsync(
    `INSERT INTO receipts (id, sale_id, amount_in_cents, methods, method_amounts_in_cents,
      received_at, note, reverses_receipt_id, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [uuid(), saleId, -r.amount_in_cents, '[]', '[]', todayISO(), 'Estorno', receiptId, nowISO()],
  )
}
