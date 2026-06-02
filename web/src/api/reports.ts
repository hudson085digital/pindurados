import { api } from '@/lib/axios'

export interface Summary {
  totalSoldInCents: number
  totalReceivedInCents: number
  totalToReceiveInCents: number
  totalCostInCents: number
  projectedProfitInCents: number
  salesCount: number
  settledSalesCount: number
  overdueInstallments: number
  lateInstallments: number
}

export async function getSummary() {
  const response = await api.get<Summary>('/reports/summary')
  return response.data
}
