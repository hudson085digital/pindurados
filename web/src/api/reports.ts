import { api } from '@/lib/axios'
import { LojaDashboard } from './types'

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

export interface Dashboard {
  totals: {
    soldInCents: number
    receivedInCents: number
    toReceiveInCents: number
    costInCents: number
    profitInCents: number
    salesCount: number
    settledSalesCount: number
    overdueInstallments: number
    lateInstallments: number
    customersWithDebt: number
    receiptsPendingProof: number
  }
  receivedByMonth: { month: string; amountInCents: number }[]
  byMethod: { method: string; amountInCents: number }[]
  topDebtors: { customerId: string; name: string; balanceInCents: number }[]
  upcoming: {
    customerName: string
    number: number
    dueDate: string
    balanceInCents: number
    overdue: boolean
  }[]
  // 025 — bloco da loja (aditivo)
  loja?: LojaDashboard
}

export async function getDashboard() {
  const response = await api.get<Dashboard>('/reports/dashboard')
  return response.data
}
