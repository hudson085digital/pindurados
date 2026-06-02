import { api } from '@/lib/axios'
import { PixKey, PixKeyType } from './types'

export async function fetchPixKeys() {
  const response = await api.get<{ pixKeys: PixKey[] }>('/pix-keys')
  return response.data.pixKeys
}

export interface CreatePixKeyBody {
  type: PixKeyType
  key: string
  bankName: string
  holderName: string
  makeDefault?: boolean
}

export async function createPixKey(body: CreatePixKeyBody) {
  const response = await api.post<{ pixKey: PixKey }>('/pix-keys', body)
  return response.data.pixKey
}

export async function setDefaultPixKey(id: string) {
  await api.patch(`/pix-keys/${id}/default`)
}

export async function deletePixKey(id: string) {
  await api.delete(`/pix-keys/${id}`)
}
