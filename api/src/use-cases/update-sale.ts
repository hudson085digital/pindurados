import { SalesRepository, ReparcelarInstallment } from '@/repositories/sales-repository'
import { serializeSale, SerializedSale } from '@/utils/serialize-sale'
import { calculateSale, SaleType } from './calculate-sale'
import { addMonthsISO, isoToDate, toISODate } from '@/utils/add-months'
import { sumReceipts } from '@/utils/allocate-receipts'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

interface UpdateSaleUseCaseRequest {
  userId: string
  saleId: string
  description?: string | null
  productCostInCents?: number
  /** "YYYY-MM-DD" */
  saleDate?: string
  /** "YYYY-MM-DD" — vencimento da 1ª parcela ao reparcelar. */
  firstDueDate?: string
  // Campos de reparcelamento (se algum vier, regenera as parcelas):
  type?: SaleType
  productValueInCents?: number
  downPaymentInCents?: number
  interestPercent?: number
  installmentsCount?: number
  targetTotalInCents?: number
  customInstallmentValuesInCents?: number[]
  /** Vencimento de cada parcela ("YYYY-MM-DD"), alinhado às parcelas geradas. */
  dueDatesISO?: string[]
}

interface UpdateSaleUseCaseResponse {
  sale: SerializedSale
}

function brl(cents: number): string {
  const intPart = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${intPart},${String(cents % 100).padStart(2, '0')}`
}

// Edita uma venda. Sem campos financeiros, só atualiza descrição/custo/data.
// Com campos financeiros, faz um REPARCELAMENTO: recalcula o total e regenera as
// parcelas, mantendo os recebimentos (o que já foi pago é considerado via cascata).
export class UpdateSaleUseCase {
  constructor(private salesRepository: SalesRepository) {}

  async execute(req: UpdateSaleUseCaseRequest): Promise<UpdateSaleUseCaseResponse> {
    const sale = await this.salesRepository.findById(req.saleId)
    if (!sale || sale.customer.userId !== req.userId) {
      throw new ResourceNotFoundError('Venda')
    }

    if (req.productCostInCents !== undefined && req.productCostInCents < 0) {
      throw new BusinessRuleError('O custo não pode ser negativo.')
    }

    const isReparcelamento =
      req.type !== undefined ||
      req.productValueInCents !== undefined ||
      req.interestPercent !== undefined ||
      req.installmentsCount !== undefined ||
      req.targetTotalInCents !== undefined ||
      req.customInstallmentValuesInCents !== undefined ||
      req.dueDatesISO !== undefined

    if (!isReparcelamento) {
      const updated = await this.salesRepository.update(req.saleId, {
        ...(req.description !== undefined ? { description: req.description } : {}),
        ...(req.productCostInCents !== undefined ? { productCostInCents: req.productCostInCents } : {}),
        ...(req.saleDate !== undefined ? { saleDate: isoToDate(req.saleDate) } : {}),
      })
      return { sale: serializeSale(updated) }
    }

    // --- Reparcelamento ---
    const calc = calculateSale({
      type: req.type ?? sale.type,
      productValueInCents: req.productValueInCents ?? sale.productValueInCents,
      downPaymentInCents: req.downPaymentInCents ?? sale.downPaymentInCents,
      interestPercent: req.interestPercent,
      installmentsCount: req.installmentsCount,
      targetTotalInCents: req.targetTotalInCents,
      customInstallmentValuesInCents: req.customInstallmentValuesInCents,
    })

    // Valores definidos pelo usuário (sem cálculo automático de juros): cada parcela
    // deve ser > 0 e a soma deve bater com o total da venda informado.
    if (req.customInstallmentValuesInCents) {
      if (req.customInstallmentValuesInCents.some((v) => !Number.isInteger(v) || v <= 0)) {
        throw new BusinessRuleError('Cada parcela deve ser maior que zero.')
      }
      if (req.targetTotalInCents !== undefined && calc.totalInCents !== req.targetTotalInCents) {
        throw new BusinessRuleError(
          `A soma das parcelas deve ser igual ao valor da venda (${brl(req.targetTotalInCents)}).`,
        )
      }
    }

    const alreadyReceived = sumReceipts(sale.receipts)
    if (calc.totalInCents < alreadyReceived) {
      throw new BusinessRuleError(
        `O novo total (${brl(calc.totalInCents)}) não pode ser menor que o já recebido (${brl(alreadyReceived)}).`,
      )
    }

    // Vencimento da 1ª parcela: informado, ou o da 1ª parcela atual, ou 1 mês após a venda.
    const saleISO = req.saleDate ?? toISODate(sale.saleDate)
    const current = sale.installments.slice().sort((a, b) => a.number - b.number)[0]
    const firstDueISO =
      req.firstDueDate ?? (current ? toISODate(current.dueDate) : addMonthsISO(saleISO, 1))

    const installments: ReparcelarInstallment[] = calc.installmentValuesInCents.map(
      (amountInCents, index) => ({
        number: index + 1,
        amountInCents,
        // Vencimento: informado por parcela, ou cascata a partir da 1ª.
        dueDate: req.dueDatesISO?.[index]
          ? isoToDate(req.dueDatesISO[index])
          : isoToDate(addMonthsISO(firstDueISO, index)),
      }),
    )

    const updated = await this.salesRepository.reparcelar(
      req.saleId,
      {
        ...(req.description !== undefined ? { description: req.description } : {}),
        ...(req.productCostInCents !== undefined ? { productCostInCents: req.productCostInCents } : {}),
        ...(req.saleDate !== undefined ? { saleDate: isoToDate(req.saleDate) } : {}),
        type: req.type ?? sale.type,
        productValueInCents: calc.productValueInCents,
        downPaymentInCents: calc.downPaymentInCents,
        interestPercent: calc.interestPercent,
        totalInCents: calc.totalInCents,
      },
      installments,
    )

    return { sale: serializeSale(updated) }
  }
}
