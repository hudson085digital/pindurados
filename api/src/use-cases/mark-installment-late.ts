import { Installment } from '@prisma/client'
import { InstallmentsRepository } from '@/repositories/installments-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface MarkInstallmentLateUseCaseRequest {
  userId: string
  installmentId: string
  /** Taxa de atraso em %. Se omitida, usa a da venda (padrão 25%). */
  lateFeePercent?: number
  reason?: string | null
}

interface MarkInstallmentLateUseCaseResponse {
  installment: Installment
}

export class MarkInstallmentLateUseCase {
  constructor(private installmentsRepository: InstallmentsRepository) {}

  async execute({
    userId,
    installmentId,
    lateFeePercent,
    reason,
  }: MarkInstallmentLateUseCaseRequest): Promise<MarkInstallmentLateUseCaseResponse> {
    const installment = await this.installmentsRepository.findById(installmentId)
    if (!installment || installment.sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Parcela')
    }

    const { sale, ...data } = installment
    const fee = lateFeePercent ?? sale.lateFeePercent ?? 25

    // Juros de atraso: % sobre o valor da parcela, uma única vez (não acumula).
    data.isLate = true
    data.lateFeePercent = fee
    data.lateInterestInCents = Math.round(data.amountInCents * (fee / 100))
    data.lateReason = reason ?? null

    const updated = await this.installmentsRepository.save(data)

    return { installment: updated }
  }
}
