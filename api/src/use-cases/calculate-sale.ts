// ====== Calculadora de juros do Pindurados (lógica pura, em centavos) ======
// Esta função NÃO acessa banco — é 100% testável.
//
// Modos:
//  - MANUAL:   informo o juros % E o nº de parcelas livremente.
//  - BY_TOTAL: informo o VALOR FINAL e o nº de parcelas; o juros é deduzido.
//
// Em qualquer modo posso ainda passar `customInstallmentValuesInCents` para
// definir o valor de cada parcela na mão (ex.: 2x 1000 + 1x 500). Nesse caso o
// total passa a ser a soma desses valores e o juros é recalculado.

// AUTOMATIC permanece só para compatibilidade com vendas antigas no banco.
export type SaleType = 'AUTOMATIC' | 'MANUAL' | 'BY_TOTAL'

export interface CalculateSaleInput {
  type: SaleType
  productValueInCents: number
  downPaymentInCents?: number
  /** MANUAL. */
  interestPercent?: number
  /** MANUAL e BY_TOTAL. */
  installmentsCount?: number
  /** BY_TOTAL: valor final desejado (com juros embutido). */
  targetTotalInCents?: number
  /** Override: valor de cada parcela na mão. */
  customInstallmentValuesInCents?: number[]
}

export interface CalculateSaleResult {
  productValueInCents: number
  downPaymentInCents: number
  interestPercent: number
  remainingInCents: number
  interestInCents: number
  totalInCents: number
  installmentsCount: number
  installmentValuesInCents: number[]
  /** true quando o valor das parcelas foi definido manualmente. */
  custom: boolean
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100
}

// Divide um total em N parcelas inteiras (centavos); a sobra vai na última.
function splitTotal(totalInCents: number, count: number): number[] {
  const base = Math.floor(totalInCents / count)
  const values: number[] = []
  let acc = 0
  for (let i = 0; i < count; i++) {
    if (i === count - 1) {
      values.push(totalInCents - acc)
    } else {
      values.push(base)
      acc += base
    }
  }
  return values
}

export function calculateSale(input: CalculateSaleInput): CalculateSaleResult {
  const productValueInCents = Math.round(input.productValueInCents)
  const downPaymentInCents = Math.round(input.downPaymentInCents ?? 0)
  const remainingInCents = Math.max(0, productValueInCents - downPaymentInCents)

  let totalInCents: number
  let installmentValuesInCents: number[]
  let installmentsCount: number
  let interestPercent: number
  let custom = false

  const customValues = input.customInstallmentValuesInCents
    ?.map((v) => Math.round(v))
    .filter((v) => v > 0)

  if (customValues && customValues.length > 0) {
    // ---- Valores definidos na mão ----
    custom = true
    installmentValuesInCents = customValues
    installmentsCount = customValues.length
    totalInCents = customValues.reduce((s, v) => s + v, 0)
    interestPercent =
      remainingInCents > 0
        ? roundPercent(((totalInCents - remainingInCents) / remainingInCents) * 100)
        : 0
  } else if (input.type === 'BY_TOTAL') {
    // ---- Valor final define o juros ----
    totalInCents = Math.round(input.targetTotalInCents ?? 0)
    installmentsCount = Math.max(1, Math.floor(input.installmentsCount ?? 1))
    interestPercent =
      remainingInCents > 0
        ? roundPercent(((totalInCents - remainingInCents) / remainingInCents) * 100)
        : 0
    installmentValuesInCents = splitTotal(totalInCents, installmentsCount)
  } else {
    // ---- MANUAL: juros % + nº de parcelas ----
    interestPercent = input.interestPercent ?? 0
    const interestInCents = Math.round(remainingInCents * (interestPercent / 100))
    totalInCents = remainingInCents + interestInCents
    installmentsCount = Math.max(1, Math.floor(input.installmentsCount ?? 1))
    installmentValuesInCents = splitTotal(totalInCents, installmentsCount)
  }

  const interestInCents = totalInCents - remainingInCents

  return {
    productValueInCents,
    downPaymentInCents,
    interestPercent,
    remainingInCents,
    interestInCents,
    totalInCents,
    installmentsCount,
    installmentValuesInCents,
    custom,
  }
}
