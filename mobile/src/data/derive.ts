// Deriva os campos calculados de uma venda (status/saldo/atraso/lucro) a partir
// dos eventos locais, usando a alocação do @pindurados/core. Porta fiel de
// api/src/utils/serialize-sale.ts. Tudo em centavos; datas ISO (YYYY-MM-DD).
import { allocateReceipts, sumReceipts } from '@pindurados/core'
import { todayISO } from './ids'
import type { SaleRow, InstallmentRow, ReceiptRow, DerivedSale, DerivedInstallment } from './model'

export function deriveSale(
  sale: SaleRow,
  installments: InstallmentRow[],
  receipts: ReceiptRow[],
): DerivedSale {
  const today = todayISO()
  const ordered = [...installments].sort((a, b) => a.number - b.number)

  const allocation = allocateReceipts(
    ordered.map((inst) => ({
      amountInCents: inst.amountInCents,
      isLate: inst.isLate,
      lateInterestInCents: inst.lateInterestInCents,
    })),
    sumReceipts(receipts.map((r) => ({ amountInCents: r.amountInCents }))),
  )

  const derivedInstallments: DerivedInstallment[] = ordered.map((inst, i) => {
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

  const orderedReceipts = [...receipts].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  )

  // Lucro previsto = entrada + total acordado − custo (entrada conta como receita).
  const profitInCents = sale.downPaymentInCents + sale.totalInCents - sale.productCostInCents

  // Recebimentos positivos, não estornados e SEM comprovante → alerta (spec 019).
  const reversedIds = new Set(
    receipts.filter((r) => r.reversesReceiptId).map((r) => r.reversesReceiptId),
  )
  const receiptsPendingProof = orderedReceipts.filter(
    (r) => r.amountInCents > 0 && !reversedIds.has(r.id) && r.attachments.length === 0,
  ).length

  const totalDueInCents = allocation.totalDueInCents
  const balanceInCents = allocation.balanceInCents

  return {
    ...sale,
    installments: derivedInstallments,
    receipts: orderedReceipts,
    totalDueInCents,
    totalPaidInCents: allocation.totalReceivedInCents,
    balanceInCents,
    profitInCents,
    receiptsPendingProof,
    settled: balanceInCents <= 0 && totalDueInCents > 0,
  }
}
