import { api } from '@/lib/axios'

// Carteira de cashback: crédito confirmado entra; saque/uso sai.
export interface WalletEntry {
  id: string
  amountInCents: number
  kind: string
  note: string | null
  createdAt: string
  productName: string | null
}

export async function fetchWallet() {
  const response = await api.get<{ balanceInCents: number; entries: WalletEntry[] }>(
    '/wallet',
  )
  return response.data
}

export async function withdrawWallet(amountInCents: number, note?: string) {
  const response = await api.post('/wallet/withdraw', { amountInCents, note })
  return response.data
}
