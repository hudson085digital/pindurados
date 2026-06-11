import { getDb } from '../db'
import { uuid, nowISO } from '../ids'
import { rowToPixKey } from '../mappers'
import type { PixKey, PixKeyType } from '../model'

export async function listPixKeys(): Promise<PixKey[]> {
  const db = await getDb()
  const rows = await db.getAllAsync(
    'SELECT * FROM pix_keys ORDER BY is_default DESC, created_at DESC',
  )
  return rows.map((r) => rowToPixKey(r as any))
}

export async function getDefaultPixKey(): Promise<PixKey | null> {
  const db = await getDb()
  const row = await db.getFirstAsync('SELECT * FROM pix_keys WHERE is_default = 1 LIMIT 1')
  return row ? rowToPixKey(row as any) : null
}

export interface PixKeyInput {
  type: PixKeyType
  key: string
  bankName: string
  holderName: string
}

export async function createPixKey(input: PixKeyInput): Promise<string> {
  const db = await getDb()
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM pix_keys')
  const isDefault = (count?.n ?? 0) === 0 ? 1 : 0
  const id = uuid()
  await db.runAsync(
    `INSERT INTO pix_keys (id, type, key, bank_name, holder_name, is_default, created_at)
     VALUES (?,?,?,?,?,?,?)`,
    [id, input.type, input.key, input.bankName, input.holderName, isDefault, nowISO()],
  )
  return id
}

export async function setDefaultPixKey(id: string): Promise<void> {
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE pix_keys SET is_default = 0', [])
    await db.runAsync('UPDATE pix_keys SET is_default = 1 WHERE id = ?', [id])
  })
}

export async function removePixKey(id: string): Promise<void> {
  const db = await getDb()
  const wasDefault = await db.getFirstAsync<{ is_default: number }>(
    'SELECT is_default FROM pix_keys WHERE id = ?',
    id,
  )
  await db.runAsync('DELETE FROM pix_keys WHERE id = ?', [id])
  // Se removeu a padrão, promove a mais recente restante.
  if (wasDefault?.is_default === 1) {
    const next = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM pix_keys ORDER BY created_at DESC LIMIT 1',
    )
    if (next) await db.runAsync('UPDATE pix_keys SET is_default = 1 WHERE id = ?', [next.id])
  }
}
