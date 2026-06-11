// Armazenamento de comprovantes no aparelho. Caminhos guardados de forma
// RELATIVA ("comprovantes/arquivo.jpg"); o app resolve para o documentDirectory.
import * as FileSystem from 'expo-file-system/legacy'
import { uuid } from './ids'

const REL_DIR = 'comprovantes'
const DIR = `${FileSystem.documentDirectory}${REL_DIR}/`

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DIR)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true })
  }
}

// Copia um arquivo (foto/galeria/PDF) escolhido para o diretório do app.
// Retorna o caminho relativo e o mime. (Compressão de imagem fica como melhoria.)
export async function saveAttachment(
  uri: string,
  mime?: string | null,
): Promise<{ path: string; mime: string }> {
  await ensureDir()
  const lower = uri.toLowerCase()
  const ext = lower.endsWith('.pdf') ? 'pdf' : lower.endsWith('.png') ? 'png' : 'jpg'
  const resolvedMime = mime ?? (ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`)
  const name = `${uuid()}.${ext}`
  const dest = `${DIR}${name}`
  await FileSystem.copyAsync({ from: uri, to: dest })
  return { path: `${REL_DIR}/${name}`, mime: resolvedMime }
}

// Resolve um caminho relativo para a URI absoluta (para abrir/compartilhar).
export function attachmentUri(relativePath: string): string {
  return `${FileSystem.documentDirectory}${relativePath}`
}

export async function deleteAttachment(relativePath: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${relativePath}`, {
      idempotent: true,
    })
  } catch {
    // ignora — arquivo já ausente
  }
}
