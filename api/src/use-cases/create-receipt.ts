import { Receipt, ReceiptMethod } from '@prisma/client'
import { SalesRepository } from '@/repositories/sales-repository'
import { ReceiptsRepository } from '@/repositories/receipts-repository'
import { allocateReceipts, sumReceipts } from '@/utils/allocate-receipts'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

interface CreateReceiptUseCaseRequest {
  userId: string
  saleId: string
  amountInCents: number
  method: ReceiptMethod
  receivedAt?: Date
  note?: string | null
  receiptPath?: string | null
}

interface CreateReceiptUseCaseResponse {
  receipt: Receipt
}

function formatBRL(cents: number): string {
  const intPart = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decPart = String(cents % 100).padStart(2, '0')
  return `R$ ${intPart},${decPart}`
}

export class CreateReceiptUseCase {
  constructor(
    private salesRepository: SalesRepository,
    private receiptsRepository: ReceiptsRepository,
  ) {}

  async execute({
    userId,
    saleId,
    amountInCents,
    method,
    receivedAt,
    note,
    receiptPath,
  }: CreateReceiptUseCaseRequest): Promise<CreateReceiptUseCaseResponse> {
    const sale = await this.salesRepository.findById(saleId)
    if (!sale || sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Venda')
    }

    if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
      throw new BusinessRuleError('Informe um valor de recebimento maior que zero.')
    }

    // Comprovante de pagamento é obrigatório (spec 005).
    if (!receiptPath) {
      throw new BusinessRuleError('Anexe o comprovante de pagamento.')
    }

    // Saldo atual = total devido (com multa/juros) − recebimentos já lançados.
    const allocation = allocateReceipts(
      sale.installments.map((inst) => ({
        amountInCents: inst.amountInCents,
        isLate: inst.isLate,
        lateInterestInCents: inst.lateInterestInCents,
      })),
      sumReceipts(sale.receipts),
    )
    const balanceInCents = allocation.balanceInCents

    if (balanceInCents <= 0) {
      throw new BusinessRuleError('Este crediário já está quitado.')
    }

    // Q2: limita o recebimento ao saldo (sem crédito a favor).
    if (amountInCents > balanceInCents) {
      throw new BusinessRuleError(
        `O valor excede o saldo devedor. Receba no máximo ${formatBRL(balanceInCents)}.`,
      )
    }

    const receipt = await this.receiptsRepository.create({
      saleId,
      amountInCents,
      method,
      receivedAt: receivedAt ?? new Date(),
      note: note ?? null,
      receiptPath: receiptPath ?? null,
      createdBy: userId,
    })

    return { receipt }
  }
}
