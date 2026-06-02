import { SaleWithDetails } from '@/repositories/sales-repository'
import {
  allocateReceipts,
  sumReceipts,
  InstallmentStatus,
} from '@/utils/allocate-receipts'

// Enriquece uma venda com campos calculados (pago, saldo, status, atraso) para
// devolver pronta ao front-end. A alocação por parcela é DERIVADA dos recebimentos
// (eventos no nível da venda) — ver utils/allocate-receipts.ts. Tudo em centavos.

export type { InstallmentStatus }

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function serializeSale(sale: SaleWithDetails) {
  const today = startOfToday()

  const ordered = sale.installments.slice().sort((a, b) => a.number - b.number)

  const allocation = allocateReceipts(
    ordered.map((inst) => ({
      amountInCents: inst.amountInCents,
      isLate: inst.isLate,
      lateInterestInCents: inst.lateInterestInCents,
    })),
    sumReceipts(sale.receipts),
  )

  const installments = ordered.map((inst, i) => {
    const a = allocation.installments[i]
    const overdue = a.status !== 'PAID' && inst.dueDate < today

    return {
      ...inst,
      paidInCents: a.paidInCents,
      latePaidInCents: a.latePaidInCents,
      principalPaidInCents: a.principalPaidInCents,
      effectiveInCents: a.effectiveInCents,
      balanceInCents: a.balanceInCents,
      status: a.status,
      overdue,
    }
  })

  const totalDueInCents = allocation.totalDueInCents
  const totalPaidInCents = allocation.totalReceivedInCents
  const balanceInCents = allocation.balanceInCents

  // Recebimentos em ordem cronológica (extrato/auditoria).
  const receipts = sale.receipts
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  // Lucro previsto = total acordado da venda (com juros) − custo do produto.
  const profitInCents = sale.totalInCents - sale.productCostInCents

  return {
    ...sale,
    installments,
    receipts,
    totalDueInCents,
    totalPaidInCents,
    balanceInCents,
    profitInCents,
    settled: balanceInCents <= 0 && totalDueInCents > 0,
  }
}

export type SerializedSale = ReturnType<typeof serializeSale>
