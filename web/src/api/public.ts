import { publicApi } from '@/lib/axios'
import { InstallmentStatus, PixKeyType, ReceiptMethod } from './types'

// Visão pública da venda (023) — espelha o DTO whitelist do backend
// (api/src/utils/serialize-public-sale.ts). Datas chegam como ISO string.
export interface PublicSaleView {
  saleDescription: string | null
  customerName: string
  creditorName: string
  totalInCents: number
  downPaymentInCents: number
  totalPaidInCents: number
  balanceInCents: number
  settled: boolean
  installments: {
    number: number
    amountInCents: number
    dueDate: string
    status: InstallmentStatus
    overdue: boolean
    balanceInCents: number
  }[]
  receipts: {
    receivedAt: string
    amountInCents: number
    methods: ReceiptMethod[]
    methodAmountsInCents: number[]
    attachments: { path: string; method: ReceiptMethod | null }[]
    receiptPath: string | null
  }[]
  // 025 — itens vendidos (só nome e garantia)
  items?: { name: string; warrantyUntil: string | null }[]
  pix?: { type: PixKeyType; key: string; holderName: string; bankName: string }
  contact?: { phone: string; whatsappUrl: string }
}

export async function getPublicSale(token: string) {
  const response = await publicApi.get<{ sale: PublicSaleView }>(
    `/public/sales/${encodeURIComponent(token)}`,
  )
  return response.data.sale
}
