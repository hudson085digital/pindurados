import { api } from '@/lib/axios'
import { CalculationResult, Sale, SaleType } from './types'

export interface CalculateBody {
  type: SaleType
  productValueInCents: number
  productCostInCents?: number
  downPaymentInCents?: number
  interestPercent?: number
  installmentsCount?: number
  targetTotalInCents?: number
  customInstallmentValuesInCents?: number[]
}

export interface ChargeMessageResponse {
  message: string
  phone: string | null
  whatsappUrl: string | null
}

export async function getChargeMessage(saleId: string) {
  const response = await api.get<ChargeMessageResponse>(`/sales/${saleId}/charge-message`)
  return response.data
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
  firstDueDate?: string
}

export async function createSale(body: CreateSaleBody) {
  const response = await api.post<{ sale: Sale }>('/sales', body)
  return response.data.sale
}

export interface UpdateSaleBody {
  description?: string | null
  productCostInCents?: number
  saleDate?: string
  // Reparcelamento (opcional): se enviados, regeneram as parcelas.
  type?: SaleType
  productValueInCents?: number
  downPaymentInCents?: number
  interestPercent?: number
  installmentsCount?: number
  firstDueDate?: string
}

export async function updateSale(id: string, body: UpdateSaleBody) {
  const response = await api.put<{ sale: Sale }>(`/sales/${id}`, body)
  return response.data.sale
}

export async function deleteSale(id: string) {
  await api.delete(`/sales/${id}`)
}
