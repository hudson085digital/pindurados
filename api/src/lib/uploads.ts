import { mkdirSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import sharp from 'sharp'

// Pasta onde os comprovantes enviados são gravados (api/uploads).
export const UPLOADS_DIR = resolve(process.cwd(), 'uploads')

mkdirSync(UPLOADS_DIR, { recursive: true })

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.bmp', '.tiff']

// Otimiza o comprovante gravado para reduzir tamanho. Imagens são
// redimensionadas (máx. 1600px) e recomprimidas em JPEG; outros formatos
// (ex.: PDF) ficam como estão. Retorna o nome de arquivo final.
export async function optimizeUpload(filename: string): Promise<string> {
  const ext = extname(filename).toLowerCase()
  if (!IMAGE_EXTS.includes(ext)) return filename

  const src = join(UPLOADS_DIR, filename)
  const outName = `${filename.replace(/\.[^.]+$/, '')}-c.jpg`
  const outPath = join(UPLOADS_DIR, outName)

  try {
    await sharp(src)
      .rotate() // respeita orientação EXIF
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toFile(outPath)
    await unlink(src).catch(() => {})
    return outName
  } catch {
    // Se algo falhar, mantém o arquivo original.
    return filename
  }
}
