export type SaleType = 'AUTOMATIC' | 'MANUAL' | 'BY_TOTAL'
export type InstallmentStatus = 'PAID' | 'PARTIAL' | 'OPEN'
export type ReceiptMethod = 'PIX' | 'CASH' | 'CARD' | 'CREDIT' | 'DEBIT'
export type PixKeyType = 'RANDOM' | 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE'

export interface PixKey {
  id: string
  type: PixKeyType
  key: string
  bankName: string
  holderName: string
  isDefault: boolean
}

// Recebimento no nível da venda (crediário). Valor negativo = estorno.
export interface Receipt {
  id: string
  amountInCents: number
  methods: ReceiptMethod[]
  methodAmountsInCents: number[]
  receivedAt: string
  note: string | null
  receiptPath: string | null
  reversesReceiptId: string | null
  createdAt: string
}

export interface Installment {
  id: string
  number: number
  amountInCents: number
  dueDate: string
  isLate: boolean
  lateInterestInCents: number
  lateFeePercent: number | null
  lateReason: string | null
  // calculados pelo back (alocação derivada dos recebimentos)
  paidInCents: number
  latePaidInCents: number
  principalPaidInCents: number
  effectiveInCents: number
  balanceInCents: number
  status: InstallmentStatus
  overdue: boolean
}

export interface Sale {
  id: string
  description: string | null
  type: SaleType
  productValueInCents: number
  productCostInCents: number
  downPaymentInCents: number
  interestPercent: number
  lateFeePercent: number
  totalInCents: number
  saleDate: string
  installments: Installment[]
  receipts: Receipt[]
  totalDueInCents: number
  totalPaidInCents: number
  balanceInCents: number
  profitInCents: number
  settled: boolean
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  note: string | null
  autoReminder: boolean
}

export interface CustomerWithBalance extends Customer {
  salesCount: number
  balanceInCents: number
}

export interface CalculationResult {
  productValueInCents: number
  downPaymentInCents: number
  interestPercent: number
  remainingInCents: number
  interestInCents: number
  totalInCents: number
  installmentsCount: number
  installmentValuesInCents: number[]
  custom: boolean
}
