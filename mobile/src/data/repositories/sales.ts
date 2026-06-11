import { calculateSale, addMonthsISO, type SaleType } from '@pindurados/core'
import { getDb } from '../db'
import { uuid, nowISO } from '../ids'
import { deriveSale } from '../derive'
import { buildSaleChargeMessage, buildWhatsappUrl } from '../charge'
import { deleteAttachment } from '../files'
import {
  rowToSale,
  rowToInstallment,
  rowToReceipt,
  rowToAttachment,
  rowToCustomer,
  rowToPixKey,
} from '../mappers'
import type {
  DerivedSale,
  SaleRow,
  InstallmentRow,
  ReceiptRow,
  AttachmentRow,
} from '../model'

// ---- Loaders (bulk + por venda) -------------------------------------------

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const r of rows) {
    const k = key(r)
    const arr = map.get(k)
    if (arr) arr.push(r)
    else map.set(k, [r])
  }
  return map
}

async function loadReceiptsFor(saleIds: string[]): Promise<Map<string, ReceiptRow[]>> {
  const db = await getDb()
  if (saleIds.length === 0) return new Map()
  const allReceipts = (await db.getAllAsync('SELECT * FROM receipts')).map((r) => r as any)
  const allAtts = (await db.getAllAsync('SELECT * FROM receipt_attachments')).map((r) =>
    rowToAttachment(r as any),
  )
  const attByReceipt = groupBy<AttachmentRow>(allAtts, (a) => a.receiptId)
  const receipts = allReceipts.map((r) => rowToReceipt(r, attByReceipt.get(r.id) ?? []))
  return groupBy<ReceiptRow>(receipts, (r) => r.saleId)
}

export async function loadAllDerivedSales(): Promise<DerivedSale[]> {
  const db = await getDb()
  const sales = (await db.getAllAsync('SELECT * FROM sales')).map((r) => rowToSale(r as any))
  const insts = (await db.getAllAsync('SELECT * FROM installments')).map((r) =>
    rowToInstallment(r as any),
  )
  const instBySale = groupBy<InstallmentRow>(insts, (i) => i.saleId)
  const recBySale = await loadReceiptsFor(sales.map((s) => s.id))
  return sales.map((s) =>
    deriveSale(s, instBySale.get(s.id) ?? [], recBySale.get(s.id) ?? []),
  )
}

export async function getSalesByCustomer(customerId: string): Promise<DerivedSale[]> {
  const all = await loadAllDerivedSales()
  return all
    .filter((s) => s.customerId === customerId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function getSaleDetail(saleId: string): Promise<DerivedSale | null> {
  const db = await getDb()
  const saleRow = await db.getFirstAsync('SELECT * FROM sales WHERE id = ?', saleId)
  if (!saleRow) return null
  const sale = rowToSale(saleRow as any)
  const insts = (
    await db.getAllAsync('SELECT * FROM installments WHERE sale_id = ?', saleId)
  ).map((r) => rowToInstallment(r as any))
  const recBySale = await loadReceiptsFor([saleId])
  return deriveSale(sale, insts, recBySale.get(saleId) ?? [])
}

// ---- Criação / edição ------------------------------------------------------

export interface CreateSaleInput {
  customerId: string
  description?: string | null
  type: SaleType
  productValueInCents: number
  productCostInCents?: number
  downPaymentInCents?: number
  interestPercent?: number
  installmentsCount?: number
  targetTotalInCents?: number
  customInstallmentValuesInCents?: number[]
  saleDate: string
  firstDueDate?: string
}

export async function createSale(input: CreateSaleInput): Promise<string> {
  const db = await getDb()
  const calc = calculateSale({
    type: input.type,
    productValueInCents: input.productValueInCents,
    downPaymentInCents: input.downPaymentInCents,
    interestPercent: input.interestPercent,
    installmentsCount: input.installmentsCount,
    targetTotalInCents: input.targetTotalInCents,
    customInstallmentValuesInCents: input.customInstallmentValuesInCents,
  })

  const settings = await db.getFirstAsync<{ default_late_fee_percent: number }>(
    'SELECT default_late_fee_percent FROM settings WHERE id = 1',
  )
  const lateFee = settings?.default_late_fee_percent ?? 25

  const saleId = uuid()
  const firstDue = input.firstDueDate || addMonthsISO(input.saleDate, 1)
  const created = nowISO()

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO sales (id, customer_id, description, type, product_value_in_cents,
        product_cost_in_cents, down_payment_in_cents, interest_percent, late_fee_percent,
        total_in_cents, sale_date, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        saleId,
        input.customerId,
        input.description ?? null,
        input.type,
        input.productValueInCents,
        input.productCostInCents ?? 0,
        input.downPaymentInCents ?? 0,
        calc.interestPercent,
        lateFee,
        calc.totalInCents,
        input.saleDate,
        created,
      ],
    )
    for (let i = 0; i < calc.installmentValuesInCents.length; i++) {
      await db.runAsync(
        `INSERT INTO installments (id, sale_id, number, amount_in_cents, due_date)
         VALUES (?,?,?,?,?)`,
        [uuid(), saleId, i + 1, calc.installmentValuesInCents[i], addMonthsISO(firstDue, i)],
      )
    }
  })
  return saleId
}

export interface UpdateSaleInput {
  description?: string | null
  productCostInCents?: number
  saleDate?: string
  reparcel?: {
    totalInCents: number
    installmentValuesInCents: number[]
    dueDatesISO: string[]
  }
}

export async function updateSale(saleId: string, patch: UpdateSaleInput): Promise<void> {
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    if (patch.description !== undefined)
      await db.runAsync('UPDATE sales SET description=? WHERE id=?', [
        patch.description ?? null,
        saleId,
      ])
    if (patch.productCostInCents !== undefined)
      await db.runAsync('UPDATE sales SET product_cost_in_cents=? WHERE id=?', [
        patch.productCostInCents,
        saleId,
      ])
    if (patch.saleDate !== undefined)
      await db.runAsync('UPDATE sales SET sale_date=? WHERE id=?', [patch.saleDate, saleId])

    if (patch.reparcel) {
      const { totalInCents, installmentValuesInCents, dueDatesISO } = patch.reparcel
      await db.runAsync('UPDATE sales SET total_in_cents=? WHERE id=?', [totalInCents, saleId])
      await db.runAsync('DELETE FROM installments WHERE sale_id=?', [saleId])
      for (let i = 0; i < installmentValuesInCents.length; i++) {
        await db.runAsync(
          `INSERT INTO installments (id, sale_id, number, amount_in_cents, due_date)
           VALUES (?,?,?,?,?)`,
          [uuid(), saleId, i + 1, installmentValuesInCents[i], dueDatesISO[i] ?? dueDatesISO[dueDatesISO.length - 1]],
        )
      }
    }
  })
}

export async function removeSale(saleId: string): Promise<void> {
  const db = await getDb()
  // Remove os arquivos de comprovante antes (o cascade apaga só as linhas).
  const atts = (await db.getAllAsync(
    `SELECT a.path AS path FROM receipt_attachments a
     JOIN receipts r ON r.id = a.receipt_id WHERE r.sale_id = ?`,
    saleId,
  )) as { path: string }[]
  for (const a of atts) await deleteAttachment(a.path)
  await db.runAsync('DELETE FROM sales WHERE id=?', [saleId])
}

// ---- Cobrança --------------------------------------------------------------

export async function getChargeMessage(
  saleId: string,
): Promise<{ message: string; whatsappUrl: string | null }> {
  const db = await getDb()
  const sale = await getSaleDetail(saleId)
  if (!sale) return { message: '', whatsappUrl: null }
  const custRow = await db.getFirstAsync('SELECT * FROM customers WHERE id = ?', sale.customerId)
  const customer = custRow ? rowToCustomer(custRow as any) : { name: 'Cliente', phone: null }
  const pixRow = await db.getFirstAsync('SELECT * FROM pix_keys WHERE is_default = 1 LIMIT 1')
  const pix = pixRow ? rowToPixKey(pixRow as any) : null
  const message = buildSaleChargeMessage(sale, { name: customer.name }, pix)
  const whatsappUrl = buildWhatsappUrl((customer as { phone: string | null }).phone, message)
  return { message, whatsappUrl }
}
