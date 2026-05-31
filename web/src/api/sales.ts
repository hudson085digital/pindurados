import { api } from '@/lib/axios'
import { CalculationResult, Sale, SaleType } from './types'

export interface CalculateBody {
  type: SaleType
  productValueInCents: number
  downPaymentInCents?: number
  interestPercent?: number
  installmentsCount?: number
  targetTotalInCents?: number
  customInstallmentValuesInCents?: number[]
}

export async function calculateSale(body: CalculateBody) {
  const response = await api.post<CalculationResult>('/sales/calculate', body)
  return response.data
}

export interface CreateSaleBody extends CalculateBody {
  customerId: string
  description?: string | null
  lateFeePercent?: number
  saleDate?: string
}

export async function createSale(body: CreateSaleBody) {
  const response = await api.post<{ sale: Sale }>('/sales', body)
  return response.data.sale
}

export async function deleteSale(id: string) {
  await api.delete(`/sales/${id}`)
}
