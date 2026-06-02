import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

// Pasta local (usada quando NÃO há Supabase Storage configurado).
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? resolve(process.env.UPLOADS_DIR)
  : resolve(process.cwd(), 'uploads')

mkdirSync(UPLOADS_DIR, { recursive: true })

// --- Modo de armazenamento ---
// Produção free: defina SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY para guardar os
// comprovantes no Supabase Storage (não precisa de disco). Sem isso, usa disco local.
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = process.env.SUPABASE_BUCKET || 'comprovantes'

export const usingSupabaseStorage = Boolean(SUPABASE_URL && SUPABASE_KEY)
const supabase = usingSupabaseStorage ? createClient(SUPABASE_URL!, SUPABASE_KEY!) : null

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.bmp', '.tiff']

function contentTypeFor(ext: string): string {
  if (ext === '.pdf') return 'application/pdf'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg'
  return 'application/octet-stream'
}

// Otimiza o buffer: imagens são redimensionadas (máx. 1600px) e recomprimidas em
// JPEG; outros formatos (ex.: PDF) passam direto.
async function optimize(buffer: Buffer, originalName: string) {
  const ext = extname(originalName).toLowerCase()
  if (IMAGE_EXTS.includes(ext)) {
    try {
      const out = await sharp(buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 72, mozjpeg: true })
        .toBuffer()
      return { data: out, ext: '.jpg', contentType: 'image/jpeg' }
    } catch {
      // se falhar, mantém o original
    }
  }
  return { data: buffer, ext, contentType: contentTypeFor(ext) }
}

// Grava um comprovante (otimizado) no storage e devolve a chave/nome do arquivo.
export async function storeComprovante(buffer: Buffer, originalName: string): Promise<string> {
  const { data, ext, contentType } = await optimize(buffer, originalName)
  const key = `${randomUUID()}${ext}`

  if (supabase) {
    const { error } = await supabase.storage.from(BUCKET).upload(key, data, { contentType })
    if (error) throw error
  } else {
    await writeFile(join(UPLOADS_DIR, key), data)
  }
  return key
}

// URL pública de um comprovante (Supabase). Local → null (servido pela própria API).
export function comprovanteUrl(key: string): string | null {
  if (!supabase) return null
  return supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl
}
