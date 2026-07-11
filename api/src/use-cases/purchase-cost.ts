// Cálculo puro do custo efetivo de uma compra (025 — loja de eletrônicos).
// Reproduz a matemática da planilha "Compras de Produtos - Milhas":
//
//   valor dos produtos   = quantidade × valor unitário   (SEM frete)
//   pago com frete       = valor dos produtos + frete
//   MILES:    milhas esperadas = reais dos produtos × acúmulo/real
//             valor das milhas = milhas ÷ 1.000 × CPM
//             custo final = pago com frete − valor das milhas
//   CASHBACK: valor esperado = % sobre o valor dos produtos (sem frete),
//             mas NÃO abate o custo — quando credita vira saldo na CARTEIRA
//             (uso em compras futuras ou saque). Custo = pago com frete.
//   Nubank (opcional)    = custo final × (1 − desconto de antecipação)
//
// Tudo em CENTAVOS (Int). O crédito REAL (quando confirmado) substitui o
// esperado. A sobra de centavos da divisão por unidade vai para a 1ª unidade.

import { PurchaseFormat } from '@prisma/client'

export interface PurchaseCostInput {
  format: PurchaseFormat
  quantity: number
  unitValueInCents: number
  freightInCents?: number | null
  /** Milhas por real gasto (formato MILES). */
  accrualPerReal?: number | null
  /** Custo do milheiro, em centavos (formato MILES). */
  cpmInCents?: number | null
  /** Percentual de cashback (formato CASHBACK). */
  cashbackPercent?: number | null
  /** Valor real creditado (substitui o esperado quando confirmado). */
  actualCreditInCents?: number | null
  nubankAdvance?: boolean
  nubankDiscountPercent?: number | null
}

export interface PurchaseCost {
  goodsValueInCents: number
  paidWithFreightInCents: number
  /** Quantidade de milhas esperadas (0 fora do formato MILES). */
  expectedMiles: number
  /** Valor esperado de milhas/cashback, em centavos. */
  expectedCreditInCents: number
  /** Crédito efetivo usado no custo: real (se confirmado) ou esperado. */
  creditInCents: number
  finalCostInCents: number
  finalCostNubankInCents: number | null
  /** Custo final usado nas unidades (Nubank quando marcado). */
  effectiveFinalCostInCents: number
  /** Custo por unidade; sobra de centavos na primeira. */
  unitCostsInCents: number[]
}

export function calculatePurchaseCost(input: PurchaseCostInput): PurchaseCost {
  const quantity = Math.max(1, Math.trunc(input.quantity))
  const freight = Math.max(0, input.freightInCents ?? 0)
  const goodsValueInCents = quantity * input.unitValueInCents
  const paidWithFreightInCents = goodsValueInCents + freight

  let expectedMiles = 0
  let expectedCreditInCents = 0

  if (input.format === 'MILES' && input.accrualPerReal && input.cpmInCents) {
    expectedMiles = (goodsValueInCents / 100) * input.accrualPerReal
    expectedCreditInCents = Math.round((expectedMiles / 1000) * input.cpmInCents)
  } else if (input.format === 'CASHBACK' && input.cashbackPercent) {
    expectedCreditInCents = Math.round(
      goodsValueInCents * (input.cashbackPercent / 100),
    )
  }

  const creditInCents = input.actualCreditInCents ?? expectedCreditInCents
  // cashback não desconta o custo (vai para a carteira); milhas descontam
  const finalCostInCents =
    input.format === 'CASHBACK'
      ? paidWithFreightInCents
      : paidWithFreightInCents - creditInCents

  const nubankPercent = input.nubankDiscountPercent ?? 4.5
  const finalCostNubankInCents = input.nubankAdvance
    ? Math.round(finalCostInCents * (1 - nubankPercent / 100))
    : null

  const effectiveFinalCostInCents = finalCostNubankInCents ?? finalCostInCents

  const base = Math.floor(effectiveFinalCostInCents / quantity)
  const unitCostsInCents = Array.from({ length: quantity }, (_, i) =>
    i === 0 ? effectiveFinalCostInCents - base * (quantity - 1) : base,
  )

  return {
    goodsValueInCents,
    paidWithFreightInCents,
    expectedMiles,
    expectedCreditInCents,
    creditInCents,
    finalCostInCents,
    finalCostNubankInCents,
    effectiveFinalCostInCents,
    unitCostsInCents,
  }
}
