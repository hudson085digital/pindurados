import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { BusinessRuleError } from '@/use-cases/errors/business-rule-error'

// Pasta local (usada quando NÃO há Supabase Storage configurado).
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? resolve(process.env.UPLOADS_DIR)
  : resolve(process.cwd(), 'uploads')

mkdirSync(UPLOADS_DIR, { recursive: true })

// --- Modo de armazenamento ---
// Produção free: defina SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY para guardar os
// comprovantes no Supabase Storage (não precisa de disco). Sem isso, usa disco local.
// Normaliza para SÓ a origem (https://<ref>.supabase.co), descartando qualquer
// caminho/barra extra (ex.: se colaram o endpoint S3 .../storage/v1/s3) que causa
// "Invalid path specified in request URL".
function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  try {
    return new URL(trimmed).origin
  } catch {
    return trimmed.replace(/\/+$/, '')
  }
}

const SUPABASE_URL = normalizeSupabaseUrl(process.env.SUPABASE_URL)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const BUCKET = (process.env.SUPABASE_BUCKET || 'comprovantes').trim()

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
  // Extensão só com letras/números (evita "Invalid path" no Storage).
  const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : ''
  const key = `${randomUUID()}${safeExt}`

  if (supabase) {
    const { error } = await supabase.storage.from(BUCKET).upload(key, data, { contentType })
    if (error) {
      console.error('[storage] upload falhou', {
        bucket: BUCKET,
        key,
        supabaseUrl: SUPABASE_URL,
        error,
      })
      throw new BusinessRuleError(
        `Falha ao salvar o comprovante no Storage (bucket "${BUCKET}"): ${error.message}`,
      )
    }
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
