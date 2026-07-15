import { api } from '@/lib/axios'
import { UserOption, UserOptionKind } from './types'

export async function fetchOptions(kind?: UserOptionKind) {
  const response = await api.get<{ options: UserOption[] }>('/options', {
    params: kind ? { kind } : undefined,
  })
  return response.data.options
}

export async function createOption(body: {
  kind: UserOptionKind
  label: string
  meta?: string | null
}) {
  const response = await api.post<{ option: UserOption }>('/options', body)
  return response.data.option
}

export async function updateOption(
  id: string,
  body: { label?: string; meta?: string | null },
) {
  const response = await api.put<{ option: UserOption }>(`/options/${id}`, body)
  return response.data.option
}

export async function deleteOption(id: string) {
  await api.delete(`/options/${id}`)
}
