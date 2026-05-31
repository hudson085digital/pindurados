import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Pasta onde os comprovantes enviados são gravados (api/uploads).
export const UPLOADS_DIR = resolve(process.cwd(), 'uploads')

mkdirSync(UPLOADS_DIR, { recursive: true })
