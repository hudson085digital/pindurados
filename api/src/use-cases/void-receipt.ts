import { Receipt } from '@prisma/client'
import { ReceiptsRepository } from '@/repositories/receipts-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

interface VoidReceiptUseCaseRequest {
  userId: string
  receiptId: string
}

interface VoidReceiptUseCaseResponse {
  receipt: Receipt
}

// Estorno: cria um recebimento NEGATIVO ligado ao original (reversesReceiptId),
// sem apagar nada. Não estorna estorno nem estorna duas vezes.
export class VoidReceiptUseCase {
  constructor(private receiptsRepository: ReceiptsRepository) {}

  async execute({
    userId,
    receiptId,
  }: VoidReceiptUseCaseRequest): Promise<VoidReceiptUseCaseResponse> {
    const original = await this.receiptsRepository.findById(receiptId)
    if (!original || original.sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Recebimento')
    }

    if (original.amountInCents <= 0) {
      throw new BusinessRuleError('Não é possível estornar um estorno.')
    }

    const existingReversal = await this.receiptsRepository.findReversalOf(receiptId)
    if (existingReversal) {
      throw new BusinessRuleError('Este recebimento já foi estornado.')
    }

    const receipt = await this.receiptsRepository.create({
      saleId: original.saleId,
      amountInCents: -original.amountInCents,
      methods: original.methods,
      receivedAt: new Date(),
      note: 'Estorno',
      reversesReceiptId: original.id,
      createdBy: userId,
    })

    return { receipt }
  }
}
