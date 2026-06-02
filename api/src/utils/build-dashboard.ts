// Agregações puras para os dashboards (testável). Recebe vendas já serializadas
// (serialize-sale) e devolve KPIs + recortes. Tudo em centavos.

export interface DashSale {
  customer: { id: string; name: string }
  balanceInCents: number
  totalDueInCents: number
  totalPaidInCents: number
  productCostInCents: number
  profitInCents: number
  settled: boolean
  installments: {
    number: number
    dueDate: Date
    status: 'PAID' | 'PARTIAL' | 'OPEN'
    balanceInCents: number
    overdue: boolean
    isLate: boolean
  }[]
  receipts: { amountInCents: number; methods: string[]; receivedAt: Date }[]
}

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
  }
  receivedByMonth: { month: string; amountInCents: number }[]
  byMethod: { method: string; amountInCents: number }[]
  topDebtors: { customerId: string; name: string; balanceInCents: number }[]
  upcoming: {
    customerName: string
    number: number
    dueDate: Date
    balanceInCents: number
    overdue: boolean
  }[]
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function buildDashboard(sales: DashSale[]): DashboardData {
  let soldInCents = 0
  let receivedInCents = 0
  let toReceiveInCents = 0
  let costInCents = 0
  let profitInCents = 0
  let settledSalesCount = 0
  let overdueInstallments = 0
  let lateInstallments = 0

  const byMonth = new Map<string, number>()
  const byMethod = new Map<string, number>()
  const byCustomer = new Map<string, { name: string; balanceInCents: number }>()
  const upcoming: DashboardData['upcoming'] = []

  for (const sale of sales) {
    soldInCents += sale.totalDueInCents
    receivedInCents += sale.totalPaidInCents
    toReceiveInCents += sale.balanceInCents
    costInCents += sale.productCostInCents
    profitInCents += sale.profitInCents
    if (sale.settled) settledSalesCount++

    // saldo por cliente (agrega várias vendas do mesmo devedor)
    const c = byCustomer.get(sale.customer.id) ?? { name: sale.customer.name, balanceInCents: 0 }
    c.balanceInCents += sale.balanceInCents
    byCustomer.set(sale.customer.id, c)

    for (const inst of sale.installments) {
      if (inst.overdue) overdueInstallments++
      if (inst.isLate) lateInstallments++
      if (inst.status !== 'PAID') {
        upcoming.push({
          customerName: sale.customer.name,
          number: inst.number,
          dueDate: inst.dueDate,
          balanceInCents: inst.balanceInCents,
          overdue: inst.overdue,
        })
      }
    }

    for (const r of sale.receipts) {
      // por mês (líquido: estornos negativos reduzem)
      byMonth.set(monthKey(r.receivedAt), (byMonth.get(monthKey(r.receivedAt)) ?? 0) + r.amountInCents)

      // por forma: divide o valor igualmente entre as formas; sem forma -> "NONE"
      const ms = r.methods.length ? r.methods : ['NONE']
      const base = Math.trunc(r.amountInCents / ms.length)
      ms.forEach((m, i) => {
        const part = i === ms.length - 1 ? r.amountInCents - base * (ms.length - 1) : base
        byMethod.set(m, (byMethod.get(m) ?? 0) + part)
      })
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

  upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

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
    },
    receivedByMonth,
    byMethod: byMethodList,
    topDebtors,
    upcoming: upcoming.slice(0, 8),
  }
}
