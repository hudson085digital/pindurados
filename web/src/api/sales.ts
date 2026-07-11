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
  // 025 — loja de eletrônicos (tudo opcional)
  items?: { unitId: string; priceInCents: number; discountInCents?: number; allowAwaiting?: boolean }[]
  origin?: string
  deliveryType?: string
  saleKind?: string
  customerKind?: string
  immediateMethods?: string[]
  immediateMethodAmounts?: number[]
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

// Fotos da venda (etiqueta, nº de série, comprovante de entrega…).
export async function addSaleAttachments(
  saleId: string,
  kind: string,
  files: File[],
) {
  const form = new FormData()
  form.append('kind', kind)
  for (const file of files) form.append('foto', file)
  await api.post(`/sales/${saleId}/attachments`, form)
}

export async function deleteSaleAttachment(saleId: string, attachmentId: string) {
  await api.delete(`/sales/${saleId}/attachments/${attachmentId}`)
}

// Vincula um produto do estoque a uma venda já criada (resolve o alerta de
// "venda sem produto registrado"). Não altera total/parcelas.
export async function addSaleItem(
  saleId: string,
  unitId: string,
  priceInCents?: number,
) {
  const response = await api.post<{ sale: Sale }>(`/sales/${saleId}/items`, {
    unitId,
    priceInCents,
  })
  return response.data.sale
}
