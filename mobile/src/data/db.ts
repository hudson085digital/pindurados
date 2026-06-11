import * as SQLite from 'expo-sqlite'
import { INIT_SQL } from './migrations/0001_init'

// Banco local (no aparelho). Migrations versionadas por PRAGMA user_version.
const DB_NAME = 'pindurados.db'

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null

const MIGRATIONS: string[] = [INIT_SQL]

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;')
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;')
  const current = row?.user_version ?? 0
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.execAsync(MIGRATIONS[v])
    await db.execAsync(`PRAGMA user_version = ${v + 1};`)
  }
}

// Abre (uma vez) e migra o banco.
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db)
      return db
    })
  }
  return dbPromise
}
