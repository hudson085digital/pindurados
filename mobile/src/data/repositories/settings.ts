import { getDb } from '../db'
import { nowISO } from '../ids'
import { rowToSettings } from '../mappers'
import type { Settings } from '../model'

export async function getSettings(): Promise<Settings> {
  const db = await getDb()
  const row = await db.getFirstAsync('SELECT * FROM settings WHERE id = 1')
  return rowToSettings(row)
}

export async function updateSettings(
  patch: Partial<Pick<Settings, 'ownerName' | 'contactPhone' | 'defaultLateFeePercent'>>,
): Promise<void> {
  const db = await getDb()
  const cur = await getSettings()
  const ownerName = patch.ownerName !== undefined ? patch.ownerName : cur.ownerName
  const contactPhone = patch.contactPhone !== undefined ? patch.contactPhone : cur.contactPhone
  const lateFee =
    patch.defaultLateFeePercent !== undefined
      ? patch.defaultLateFeePercent
      : cur.defaultLateFeePercent
  await db.runAsync(
    'UPDATE settings SET owner_name=?, contact_phone=?, default_late_fee_percent=? WHERE id=1',
    [ownerName, contactPhone, lateFee],
  )
}

export async function touchLastBackup(): Promise<void> {
  const db = await getDb()
  await db.runAsync('UPDATE settings SET last_backup_at=? WHERE id=1', [nowISO()])
}
