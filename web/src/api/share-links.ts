import { api } from '@/lib/axios'

export type ShareLinkStatus = 'active' | 'revoked' | 'expired'

export interface ShareLinkState {
  exists: boolean
  token?: string
  status?: ShareLinkStatus
  expiresAt?: string | null
}

export interface CreatedShareLink {
  token: string
  status: 'active'
  expiresAt: string | null
}

// Cria ou rotaciona o link público da venda.
export async function createShareLink(saleId: string, expiresAt?: string | null) {
  const response = await api.post<CreatedShareLink>(`/sales/${saleId}/share-link`, {
    expiresAt: expiresAt ?? null,
  })
  return response.data
}

// Estado atual do link (inexistente/ativo/revogado/expirado).
export async function getShareLink(saleId: string) {
  const response = await api.get<ShareLinkState>(`/sales/${saleId}/share-link`)
  return response.data
}

// Revoga o link (invalida imediatamente).
export async function revokeShareLink(saleId: string) {
  await api.delete(`/sales/${saleId}/share-link`)
}

// Monta a URL pública a partir do token (o front é quem conhece a origin).
export function buildPublicUrl(token: string) {
  return `${window.location.origin}/p/${token}`
}
