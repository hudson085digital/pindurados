import { api } from '@/lib/axios'
import { Purchase, PurchaseFormat, PendingPanel } from './types'

export interface PurchaseBody {
  productId: string
  date: string
  quantity?: number
  unitValueInCents: number
  freightInCents?: number
  orderNumber?: string | null
  account?: string | null
  marketplace?: string | null
  format?: PurchaseFormat
  formatLabel?: string | null
  paymentMethod?: string | null
  bankCard?: string | null
  accrualPerReal?: number | null
  cpmInCents?: number | null
  cashbackPercent?: number | null
  nubankAdvance?: boolean
  nubankDiscountPercent?: number
  productExpectedAt?: string | null
  creditExpectedAt?: string | null
  note?: string | null
}

export interface PurchaseFilters {
  month?: string
  marketplace?: string
  format?: PurchaseFormat
  productStatus?: 'RECEIVED' | 'NOT_RECEIVED'
  creditStatus?: 'CREDITED' | 'NOT_CREDITED'
  search?: string
}

export async function fetchPurchases(filters: PurchaseFilters = {}) {
  const response = await api.get<{
    purchases: Purchase[]
    investedInCents: number
  }>('/purchases', { params: filters })
  return response.data
}

export async function createPurchase(body: PurchaseBody) {
  const response = await api.post<{ purchase: Purchase }>('/purchases', body)
  return response.data.purchase
}

export async function updatePurchase(id: string, body: Partial<PurchaseBody>) {
  const response = await api.put<{ purchase: Purchase }>(`/purchases/${id}`, body)
  return response.data.purchase
}

export async function receivePurchase(
  id: string,
  receivedAt: string,
  units?: {
    unitId: string
    serialNumber?: string | null
    imei1?: string | null
    imei2?: string | null
    danfe?: string | null
  }[],
) {
  const response = await api.patch<{ purchase: Purchase }>(
    `/purchases/${id}/receive`,
    { receivedAt, units },
  )
  return response.data.purchase
}

export async function creditPurchase(
  id: string,
  creditedAt: string,
  actualCreditInCents?: number,
) {
  const response = await api.patch<{ purchase: Purchase }>(
    `/purchases/${id}/credit`,
    { creditedAt, actualCreditInCents },
  )
  return response.data.purchase
}

export async function cancelPurchase(id: string) {
  await api.delete(`/purchases/${id}`)
}

export interface ImportReport {
  imported: number
  skipped: { sheet: string; line: number; reason: string }[]
}

export async function importPurchases(file: File) {
  const form = new FormData()
  form.append('planilha', file)
  const response = await api.post<ImportReport>('/purchases/import', form)
  return response.data
}

export async function fetchPendingPanel() {
  const response = await api.get<PendingPanel>('/reports/pending')
  return response.data
}
