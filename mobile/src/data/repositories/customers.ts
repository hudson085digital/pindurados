import { getDb } from '../db'
import { uuid, nowISO } from '../ids'
import { rowToCustomer } from '../mappers'
import { deleteAttachment } from '../files'
import { loadAllDerivedSales } from './sales'
import type { Customer, CustomerWithBalance } from '../model'

export async function listCustomers(): Promise<CustomerWithBalance[]> {
  const db = await getDb()
  const customers = (
    await db.getAllAsync('SELECT * FROM customers ORDER BY name COLLATE NOCASE')
  ).map((r) => rowToCustomer(r as any))

  const sales = await loadAllDerivedSales()
  const agg = new Map<string, { count: number; balance: number }>()
  for (const s of sales) {
    const e = agg.get(s.customerId) ?? { count: 0, balance: 0 }
    e.count++
    e.balance += s.balanceInCents
    agg.set(s.customerId, e)
  }

  return customers.map((c) => {
    const e = agg.get(c.id)
    return { ...c, salesCount: e?.count ?? 0, balanceInCents: e?.balance ?? 0 }
  })
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const db = await getDb()
  const row = await db.getFirstAsync('SELECT * FROM customers WHERE id = ?', id)
  return row ? rowToCustomer(row as any) : null
}

export interface CustomerInput {
  name: string
  phone?: string | null
  note?: string | null
}

export async function createCustomer(input: CustomerInput): Promise<string> {
  const db = await getDb()
  const id = uuid()
  await db.runAsync(
    'INSERT INTO customers (id, name, phone, note, auto_reminder, created_at) VALUES (?,?,?,?,0,?)',
    [id, input.name, input.phone ?? null, input.note ?? null, nowISO()],
  )
  return id
}

export async function updateCustomer(
  id: string,
  patch: Partial<{ name: string; phone: string | null; note: string | null; autoReminder: boolean }>,
): Promise<void> {
  const db = await getDb()
  if (patch.name !== undefined)
    await db.runAsync('UPDATE customers SET name=? WHERE id=?', [patch.name, id])
  if (patch.phone !== undefined)
    await db.runAsync('UPDATE customers SET phone=? WHERE id=?', [patch.phone, id])
  if (patch.note !== undefined)
    await db.runAsync('UPDATE customers SET note=? WHERE id=?', [patch.note, id])
  if (patch.autoReminder !== undefined)
    await db.runAsync('UPDATE customers SET auto_reminder=? WHERE id=?', [
      patch.autoReminder ? 1 : 0,
      id,
    ])
}

export async function setAutoReminder(id: string, value: boolean): Promise<void> {
  await updateCustomer(id, { autoReminder: value })
}

export async function removeCustomer(id: string): Promise<void> {
  const db = await getDb()
  // Apaga os arquivos de comprovante de todas as vendas do devedor.
  const atts = (await db.getAllAsync(
    `SELECT a.path AS path FROM receipt_attachments a
     JOIN receipts r ON r.id = a.receipt_id
     JOIN sales s ON s.id = r.sale_id
     WHERE s.customer_id = ?`,
    id,
  )) as { path: string }[]
  for (const a of atts) await deleteAttachment(a.path)
  await db.runAsync('DELETE FROM customers WHERE id=?', [id])
}
