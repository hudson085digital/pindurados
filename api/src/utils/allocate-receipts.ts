// Motor PURO de alocação de recebimentos de um crediário.
//
// Recebimentos são eventos no nível da venda; a correspondência com as parcelas
// é DERIVADA aqui (nada é persistido). Regras (ver spec 001-recebimento-parcial):
//   - Cascata: abate da parcela mais antiga para a mais nova (ordem do array).
//   - Dentro de uma parcela em atraso: abate multa+juros ANTES do principal (Q1).
//   - A soma dos recebimentos (pool) já vem líquida de estornos (recebimentos
//     negativos). Limitar o recebimento ao saldo é responsabilidade do use case.
//
// Tudo em centavos (Int).

export type InstallmentStatus = 'PAID' | 'PARTIAL' | 'OPEN'

export interface AllocatableInstallment {
  amountInCents: number // principal da parcela
  isLate: boolean
  lateInterestInCents: number // multa+juros (só conta quando isLate)
}

export interface InstallmentAllocation {
  principalInCents: number
  lateInterestInCents: number
  effectiveInCents: number
  latePaidInCents: number
  principalPaidInCents: number
  paidInCents: number
  balanceInCents: number
  status: InstallmentStatus
}

export interface ReceiptsAllocation {
  installments: InstallmentAllocation[]
  totalDueInCents: number
  totalReceivedInCents: number
  balanceInCents: number
}

export function allocateReceipts(
  installments: AllocatableInstallment[],
  receiptsTotalInCents: number,
): ReceiptsAllocation {
  // Pool não pode ser negativo (estornos não deixam o recebido abaixo de zero).
  let pool = Math.max(0, receiptsTotalInCents)

  const allocations = installments.map((inst): InstallmentAllocation => {
    const principalInCents = inst.amountInCents
    const lateInterestInCents = inst.isLate ? inst.lateInterestInCents : 0
    const effectiveInCents = principalInCents + lateInterestInCents

    // Q1: multa+juros primeiro, depois o principal.
    const latePaidInCents = Math.min(pool, lateInterestInCents)
    pool -= latePaidInCents

    const principalPaidInCents = Math.min(pool, principalInCents)
    pool -= principalPaidInCents

    const paidInCents = latePaidInCents + principalPaidInCents
    const balanceInCents = effectiveInCents - paidInCents

    let status: InstallmentStatus = 'OPEN'
    if (balanceInCents <= 0) status = 'PAID'
    else if (paidInCents > 0) status = 'PARTIAL'

    return {
      principalInCents,
      lateInterestInCents,
      effectiveInCents,
      latePaidInCents,
      principalPaidInCents,
      paidInCents,
      balanceInCents,
      status,
    }
  })

  const totalDueInCents = allocations.reduce((s, a) => s + a.effectiveInCents, 0)

  return {
    installments: allocations,
    totalDueInCents,
    totalReceivedInCents: receiptsTotalInCents,
    balanceInCents: totalDueInCents - receiptsTotalInCents,
  }
}

/** Soma os recebimentos (estornos entram como negativos). */
export function sumReceipts(
  receipts: { amountInCents: number }[],
): number {
  return receipts.reduce((s, r) => s + r.amountInCents, 0)
}
