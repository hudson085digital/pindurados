import { allocateReceipts, sumReceipts } from '@pindurados/core'
import { getDb } from '../db'
import { rowToInstallment } from '../mappers'

// Marca atraso: o juros incide sobre o PRINCIPAL EM ABERTO da parcela (cascata
// dos recebimentos já alocados reduz a base). Porta de api/mark-installment-late.
export async function markLate(
  installmentId: string,
  opts: { lateFeePercent?: number; reason?: string | null },
): Promise<void> {
  const db = await getDb()
  const instRow = await db.getFirstAsync('SELECT * FROM installments WHERE id = ?', installmentId)
  if (!instRow) return
  const inst = rowToInstallment(instRow as any)

  const saleRow = await db.getFirstAsync<{ late_fee_percent: number }>(
    'SELECT late_fee_percent FROM sales WHERE id = ?',
    inst.saleId,
  )
  const fee = opts.lateFeePercent ?? saleRow?.late_fee_percent ?? 25

  const insts = (
    await db.getAllAsync('SELECT * FROM installments WHERE sale_id = ? ORDER BY number', inst.saleId)
  ).map((r) => rowToInstallment(r as any))
  const recRows = (await db.getAllAsync(
    'SELECT amount_in_cents FROM receipts WHERE sale_id = ?',
    inst.saleId,
  )) as { amount_in_cents: number }[]
  const totalReceived = sumReceipts(recRows.map((r) => ({ amountInCents: r.amount_in_cents })))

  const allocation = allocateReceipts(
    insts.map((i) => ({
      amountInCents: i.amountInCents,
      // ignora o atraso desta própria parcela ao medir o principal já pago
      isLate: i.id === inst.id ? false : i.isLate,
      lateInterestInCents: i.lateInterestInCents,
    })),
    totalReceived,
  )
  const idx = insts.findIndex((i) => i.id === inst.id)
  const outstanding = idx >= 0 ? allocation.installments[idx].balanceInCents : inst.amountInCents
  const lateInterest = Math.round(Math.max(0, outstanding) * (fee / 100))

  await db.runAsync(
    'UPDATE installments SET is_late = 1, late_fee_percent = ?, late_interest_in_cents = ?, late_reason = ? WHERE id = ?',
    [fee, lateInterest, opts.reason ?? null, inst.id],
  )
}

export async function unmarkLate(installmentId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    'UPDATE installments SET is_late = 0, late_interest_in_cents = 0, late_fee_percent = NULL, late_reason = NULL WHERE id = ?',
    [installmentId],
  )
}

export async function updateDueDate(installmentId: string, dueDate: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('UPDATE installments SET due_date = ? WHERE id = ?', [dueDate, installmentId])
}
