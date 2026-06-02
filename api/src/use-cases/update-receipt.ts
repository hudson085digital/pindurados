import { Receipt, ReceiptMethod } from '@prisma/client'
import { SalesRepository } from '@/repositories/sales-repository'
import { ReceiptsRepository } from '@/repositories/receipts-repository'
import { allocateReceipts, sumReceipts } from '@/utils/allocate-receipts'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

interface UpdateReceiptUseCaseRequest {
  userId: string
  receiptId: string
  amountInCents?: number
  methods?: ReceiptMethod[]
  receivedAt?: Date
  note?: string | null
  /** Novo comprovante; se ausente, mantém o atual. */
  receiptPath?: string | null
}

interface UpdateReceiptUseCaseResponse {
  receipt: Receipt
}

function formatBRL(cents: number): string {
  const intPart = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${intPart},${String(cents % 100).padStart(2, '0')}`
}

// Edita um recebimento positivo e não estornado (spec 008).
export class UpdateReceiptUseCase {
  constructor(
    private salesRepository: SalesRepository,
    private receiptsRepository: ReceiptsRepository,
  ) {}

  async execute({
    userId,
    receiptId,
    amountInCents,
    methods,
    receivedAt,
    note,
    receiptPath,
  }: UpdateReceiptUseCaseRequest): Promise<UpdateReceiptUseCaseResponse> {
    const receipt = await this.receiptsRepository.findById(receiptId)
    if (!receipt || receipt.sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Recebimento')
    }

    if (receipt.amountInCents <= 0) {
      throw new BusinessRuleError('Não é possível editar um estorno.')
    }

    const reversal = await this.receiptsRepository.findReversalOf(receiptId)
    if (reversal) {
      throw new BusinessRuleError('Recebimento já estornado não pode ser editado.')
    }

    const newAmount = amountInCents ?? receipt.amountInCents

    if (amountInCents !== undefined) {
      if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
        throw new BusinessRuleError('Informe um valor de recebimento maior que zero.')
      }

      const sale = await this.salesRepository.findById(receipt.saleId)
      if (sale) {
        const allocation = allocateReceipts(
          sale.installments.map((inst) => ({
            amountInCents: inst.amountInCents,
            isLate: inst.isLate,
            lateInterestInCents: inst.lateInterestInCents,
          })),
          0,
        )
        const totalDue = allocation.totalDueInCents
        const otherReceipts = sumReceipts(sale.receipts) - receipt.amountInCents
        if (otherReceipts + newAmount > totalDue) {
          const max = totalDue - otherReceipts
          throw new BusinessRuleError(
            `O valor excede o saldo devedor. Máximo permitido: ${formatBRL(max)}.`,
          )
        }
      }
    }

    const updated = await this.receiptsRepository.update(receiptId, {
      amountInCents: newAmount,
      ...(methods !== undefined ? { methods } : {}),
      ...(receivedAt !== undefined ? { receivedAt } : {}),
      ...(note !== undefined ? { note } : {}),
      ...(receiptPath ? { receiptPath } : {}),
    })

    return { receipt: updated }
  }
}
