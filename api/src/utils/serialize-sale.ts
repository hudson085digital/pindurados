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

  // Lucro previsto = tudo que o cliente paga (entrada + total acordado com juros)
  // − custo do produto. A entrada conta como receita, então entra no lucro.
  const profitInCents = sale.downPaymentInCents + sale.totalInCents - sale.productCostInCents

  // Recebimentos positivos, não estornados e SEM comprovante (spec 019): alerta.
  const reversedIds = new Set(
    sale.receipts.filter((r) => r.reversesReceiptId).map((r) => r.reversesReceiptId),
  )
  const receiptsPendingProof = receipts.filter(
    (r) =>
      r.amountInCents > 0 &&
      !reversedIds.has(r.id) &&
      !r.receiptPath &&
      (r.attachments?.length ?? 0) === 0,
  ).length

  // 025 — loja: margem/mark-up derivados quando há custo. Receita = entrada +
  // total acordado (mesma base do lucro). Nada muda para vendas sem custo.
  const revenueInCents = sale.downPaymentInCents + sale.totalInCents
  const marginPercent =
    sale.productCostInCents > 0 && revenueInCents > 0
      ? Math.round((profitInCents / revenueInCents) * 1000) / 10
      : null
  const markupPercent =
    sale.productCostInCents > 0
      ? Math.round((profitInCents / sale.productCostInCents) * 1000) / 10
      : null

  return {
    ...sale,
    installments,
    receipts,
    totalDueInCents,
    totalPaidInCents,
    balanceInCents,
    profitInCents,
    marginPercent,
    markupPercent,
    receiptsPendingProof,
    settled: balanceInCents <= 0 && totalDueInCents > 0,
  }
}

export type SerializedSale = ReturnType<typeof serializeSale>
