export type SaleType = 'AUTOMATIC' | 'MANUAL' | 'BY_TOTAL'
export type InstallmentStatus = 'PAID' | 'PARTIAL' | 'OPEN'

export interface Payment {
  id: string
  amountInCents: number
  paidAt: string
  receiptPath: string | null
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
  payments: Payment[]
  // calculados pelo back
  paidInCents: number
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
  downPaymentInCents: number
  interestPercent: number
  lateFeePercent: number
  totalInCents: number
  saleDate: string
  installments: Installment[]
  totalDueInCents: number
  totalPaidInCents: number
  balanceInCents: number
  settled: boolean
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  note: string | null
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
