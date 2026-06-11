// Dashboard local — porta de api/src/utils/build-dashboard.ts sobre as vendas
// derivadas localmente. Datas como ISO string.
import { getDb } from '../db'
import { loadAllDerivedSales } from './sales'

export interface DashboardData {
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
}

export async function getDashboard(): Promise<DashboardData> {
  const sales = await loadAllDerivedSales()
  const db = await getDb()
  const custs = (await db.getAllAsync('SELECT id, name FROM customers')) as {
    id: string
    name: string
  }[]
  const nameById = new Map(custs.map((c) => [c.id, c.name]))

  let soldInCents = 0
  let receivedInCents = 0
  let toReceiveInCents = 0
  let costInCents = 0
  let profitInCents = 0
  let settledSalesCount = 0
  let overdueInstallments = 0
  let lateInstallments = 0
  let receiptsPendingProof = 0

  const byMonth = new Map<string, number>()
  const byMethod = new Map<string, number>()
  const byCustomer = new Map<string, { name: string; balanceInCents: number }>()
  const upcoming: DashboardData['upcoming'] = []

  for (const sale of sales) {
    const customerName = nameById.get(sale.customerId) ?? 'Cliente'
    soldInCents += sale.totalDueInCents
    receivedInCents += sale.totalPaidInCents
    toReceiveInCents += sale.balanceInCents
    costInCents += sale.productCostInCents
    profitInCents += sale.profitInCents
    receiptsPendingProof += sale.receiptsPendingProof
    if (sale.settled) settledSalesCount++

    const c = byCustomer.get(sale.customerId) ?? { name: customerName, balanceInCents: 0 }
    c.balanceInCents += sale.balanceInCents
    byCustomer.set(sale.customerId, c)

    for (const inst of sale.installments) {
      if (inst.overdue) overdueInstallments++
      if (inst.isLate) lateInstallments++
      if (inst.status !== 'PAID') {
        upcoming.push({
          customerName,
          number: inst.number,
          dueDate: inst.dueDate,
          balanceInCents: inst.balanceInCents,
          overdue: inst.overdue,
        })
      }
    }

    for (const r of sale.receipts) {
      const month = r.receivedAt.slice(0, 7)
      byMonth.set(month, (byMonth.get(month) ?? 0) + r.amountInCents)

      if (r.methods.length && r.methodAmountsInCents.length === r.methods.length) {
        r.methods.forEach((m, i) => {
          byMethod.set(m, (byMethod.get(m) ?? 0) + r.methodAmountsInCents[i])
        })
      } else {
        const ms = r.methods.length ? r.methods : ['NONE']
        const base = Math.trunc(r.amountInCents / ms.length)
        ms.forEach((m, i) => {
          const part = i === ms.length - 1 ? r.amountInCents - base * (ms.length - 1) : base
          byMethod.set(m, (byMethod.get(m) ?? 0) + part)
        })
      }
    }
  }

  const customersWithDebt = [...byCustomer.values()].filter((c) => c.balanceInCents > 0).length

  const receivedByMonth = [...byMonth.entries()]
    .map(([month, amountInCents]) => ({ month, amountInCents }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const byMethodList = [...byMethod.entries()]
    .map(([method, amountInCents]) => ({ method, amountInCents }))
    .filter((m) => m.amountInCents !== 0)
    .sort((a, b) => b.amountInCents - a.amountInCents)

  const topDebtors = [...byCustomer.entries()]
    .map(([customerId, v]) => ({ customerId, name: v.name, balanceInCents: v.balanceInCents }))
    .filter((d) => d.balanceInCents > 0)
    .sort((a, b) => b.balanceInCents - a.balanceInCents)
    .slice(0, 5)

  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  return {
    totals: {
      soldInCents,
      receivedInCents,
      toReceiveInCents,
      costInCents,
      profitInCents,
      salesCount: sales.length,
      settledSalesCount,
      overdueInstallments,
      lateInstallments,
      customersWithDebt,
      receiptsPendingProof,
    },
    receivedByMonth,
    byMethod: byMethodList,
    topDebtors,
    upcoming: upcoming.slice(0, 8),
  }
}
