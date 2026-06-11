// Backup/restauração local — arquivo único `.pindurados` (JSON com dados +
// comprovantes em base64). Sem zip nativo (funciona no Expo managed) e SEM
// Login com Google: o usuário escolhe onde salvar pelo compartilhar nativo.
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { getDb } from './db'
import { touchLastBackup } from './repositories/settings'
import { nowISO } from './ids'

const SCHEMA_VERSION = 1
const TABLES = [
  'settings',
  'customers',
  'sales',
  'installments',
  'receipts',
  'receipt_attachments',
  'pix_keys',
] as const

export type BackupResult = { ok: true } | { ok: false; error: string }

export async function exportBackup(): Promise<BackupResult> {
  const db = await getDb()
  const data: Record<string, any[]> = {}
  for (const t of TABLES) data[t] = (await db.getAllAsync(`SELECT * FROM ${t}`)) as any[]

  const files: { path: string; base64: string; mime: string | null }[] = []
  for (const a of data['receipt_attachments']) {
    const uri = `${FileSystem.documentDirectory}${a.path}`
    try {
      const info = await FileSystem.getInfoAsync(uri)
      if (info.exists) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        files.push({ path: a.path, base64, mime: a.mime ?? null })
      }
    } catch {
      // ignora arquivo ausente
    }
  }

  const payload = {
    manifest: {
      app: 'pindurados',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowISO(),
      counts: {
        customers: data['customers'].length,
        sales: data['sales'].length,
        receipts: data['receipts'].length,
        attachments: data['receipt_attachments'].length,
      },
    },
    data,
    files,
  }

  const dest = `${FileSystem.cacheDirectory}pindurados-backup.pindurados`
  await FileSystem.writeAsStringAsync(dest, JSON.stringify(payload))
  await touchLastBackup()

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest, {
      mimeType: 'application/json',
      dialogTitle: 'Backup Pindurados',
    })
  }
  return { ok: true }
}

export async function importBackup(uri: string): Promise<BackupResult> {
  let payload: any
  try {
    const text = await FileSystem.readAsStringAsync(uri)
    payload = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Não foi possível ler o arquivo.' }
  }

  if (payload?.manifest?.app !== 'pindurados') {
    return { ok: false, error: 'Este arquivo não é um backup do Pindurados.' }
  }
  if ((payload.manifest.schemaVersion ?? 0) > SCHEMA_VERSION) {
    return { ok: false, error: 'Backup de uma versão mais nova do app.' }
  }

  const db = await getDb()
  // FK off FORA da transação (pragma é ignorado dentro de transação).
  await db.execAsync('PRAGMA foreign_keys = OFF;')
  try {
    await db.withTransactionAsync(async () => {
      for (const t of [...TABLES].reverse()) await db.runAsync(`DELETE FROM ${t}`)
      for (const t of TABLES) {
        const rows: any[] = payload.data?.[t] ?? []
        for (const row of rows) {
          const cols = Object.keys(row)
          if (cols.length === 0) continue
          const placeholders = cols.map(() => '?').join(',')
          await db.runAsync(
            `INSERT INTO ${t} (${cols.join(',')}) VALUES (${placeholders})`,
            cols.map((c) => row[c]),
          )
        }
      }
    })
  } catch {
    return { ok: false, error: 'Falha ao restaurar; seus dados atuais foram mantidos.' }
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;')
  }

  // Restaura os arquivos de comprovante.
  const dir = `${FileSystem.documentDirectory}comprovantes/`
  try {
    const info = await FileSystem.getInfoAsync(dir)
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  } catch {
    // ignora
  }
  for (const f of payload.files ?? []) {
    try {
      await FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}${f.path}`, f.base64, {
        encoding: FileSystem.EncodingType.Base64,
      })
    } catch {
      // ignora arquivo individual com problema
    }
  }
  return { ok: true }
}
