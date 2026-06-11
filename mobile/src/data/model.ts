// Tipos da camada local do app (mapeados das tabelas SQLite para camelCase).
// Reusa os enums do domínio do @pindurados/core.
import type { ReceiptMethod, PixKeyType, SaleType, InstallmentStatus } from '@pindurados/core'

export type { ReceiptMethod, PixKeyType, SaleType, InstallmentStatus }

export interface Customer {
  id: string
  name: string
  phone: string | null
  note: string | null
  autoReminder: boolean
  createdAt: string
}

export interface CustomerWithBalance extends Customer {
  salesCount: number
  balanceInCents: number
}

export interface AttachmentRow {
  id: string
  receiptId: string
  path: string
  method: ReceiptMethod | null
  mime: string | null
  createdAt: string
}

export interface ReceiptRow {
  id: string
  saleId: string
  amountInCents: number
  methods: ReceiptMethod[]
  methodAmountsInCents: number[]
  receivedAt: string
  note: string | null
  reversesReceiptId: string | null
  createdAt: string
  attachments: AttachmentRow[]
}

export interface InstallmentRow {
  id: string
  saleId: string
  number: number
  amountInCents: number
  dueDate: string
  isLate: boolean
  lateInterestInCents: number
  lateFeePercent: number | null
  lateReason: string | null
}

export interface SaleRow {
  id: string
  customerId: string
  description: string | null
  type: SaleType
  productValueInCents: number
  productCostInCents: number
  downPaymentInCents: number
  interestPercent: number
  lateFeePercent: number
  totalInCents: number
  saleDate: string
  createdAt: string
}

// Parcela já derivada (status/saldo/atraso).
export interface DerivedInstallment extends InstallmentRow {
  paidInCents: number
  latePaidInCents: number
  principalPaidInCents: number
  effectiveInCents: number
  balanceInCents: number
  status: InstallmentStatus
  overdue: boolean
}

// Venda já derivada para exibição.
export interface DerivedSale extends SaleRow {
  installments: DerivedInstallment[]
  receipts: ReceiptRow[]
  totalDueInCents: number
  totalPaidInCents: number
  balanceInCents: number
  profitInCents: number
  receiptsPendingProof: number
  settled: boolean
}

export interface PixKey {
  id: string
  type: PixKeyType
  key: string
  bankName: string
  holderName: string
  isDefault: boolean
  createdAt: string
}

export interface Settings {
  ownerName: string | null
  contactPhone: string | null
  defaultLateFeePercent: number
  lastBackupAt: string | null
}
