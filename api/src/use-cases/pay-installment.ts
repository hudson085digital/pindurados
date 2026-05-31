import { InstallmentsRepository } from '@/repositories/installments-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface PayInstallmentUseCaseRequest {
  userId: string
  installmentId: string
  amountInCents: number
  paidAt?: Date
  receiptPath?: string | null
}

export class PayInstallmentUseCase {
  constructor(private installmentsRepository: InstallmentsRepository) {}

  async execute({
    userId,
    installmentId,
    amountInCents,
    paidAt,
    receiptPath,
  }: PayInstallmentUseCaseRequest): Promise<void> {
    const installment = await this.installmentsRepository.findById(installmentId)
    if (!installment || installment.sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Parcela')
    }

    await this.installmentsRepository.createPayment({
      installmentId,
      amountInCents,
      paidAt: paidAt ?? new Date(),
      receiptPath: receiptPath ?? null,
    })
  }
}
