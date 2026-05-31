import { SaleWithDetails } from '@/repositories/sales-repository'

// Enriquece uma venda com campos calculados (pago, saldo, status, atraso) para
// devolver pronta ao front-end. Tudo em centavos.

export type InstallmentStatus = 'PAID' | 'PARTIAL' | 'OPEN'

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function serializeSale(sale: SaleWithDetails) {
  const today = startOfToday()

  const installments = sale.installments
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((inst) => {
      const paidInCents = inst.payments.reduce((s, p) => s + p.amountInCents, 0)
      const lateInterestInCents = inst.isLate ? inst.lateInterestInCents : 0
      const effectiveInCents = inst.amountInCents + lateInterestInCents
      const balanceInCents = effectiveInCents - paidInCents

      let status: InstallmentStatus = 'OPEN'
      if (balanceInCents <= 0) status = 'PAID'
      else if (paidInCents > 0) status = 'PARTIAL'

      const overdue = status !== 'PAID' && inst.dueDate < today

      return {
        ...inst,
        paidInCents,
        effectiveInCents,
        balanceInCents,
        status,
        overdue,
      }
    })

  const totalDueInCents = installments.reduce((s, i) => s + i.effectiveInCents, 0)
  const totalPaidInCents = installments.reduce((s, i) => s + i.paidInCents, 0)
  const balanceInCents = totalDueInCents - totalPaidInCents

  return {
    ...sale,
    installments,
    totalDueInCents,
    totalPaidInCents,
    balanceInCents,
    settled: balanceInCents <= 0,
  }
}

export type SerializedSale = ReturnType<typeof serializeSale>
