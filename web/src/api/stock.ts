import { api } from '@/lib/axios'
import { StockUnit, StockUnitStatus } from './types'

export interface StockSummary {
  awaiting: { count: number; costInCents: number }
  available: { count: number; costInCents: number }
  sold: { count: number; costInCents: number }
}

export async function fetchStockUnits(filters: {
  status?: StockUnitStatus
  productId?: string
  search?: string
} = {}) {
  const response = await api.get<{ units: StockUnit[]; summary: StockSummary }>(
    '/stock-units',
    { params: filters },
  )
  return response.data
}

export async function updateStockUnit(
  id: string,
  body: {
    serialNumber?: string | null
    imei1?: string | null
    imei2?: string | null
    danfe?: string | null
    note?: string | null
    meta?: Record<string, string | number | boolean | null>
  },
) {
  const response = await api.patch<{ unit: StockUnit }>(`/stock-units/${id}`, body)
  return response.data.unit
}
