import { Installment } from '@prisma/client'
import { InstallmentsRepository } from '@/repositories/installments-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface UnmarkInstallmentLateUseCaseRequest {
  userId: string
  installmentId: string
}

interface UnmarkInstallmentLateUseCaseResponse {
  installment: Installment
}

export class UnmarkInstallmentLateUseCase {
  constructor(private installmentsRepository: InstallmentsRepository) {}

  async execute({
    userId,
    installmentId,
  }: UnmarkInstallmentLateUseCaseRequest): Promise<UnmarkInstallmentLateUseCaseResponse> {
    const installment = await this.installmentsRepository.findById(installmentId)
    if (!installment || installment.sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Parcela')
    }

    const { sale: _sale, ...data } = installment
    data.isLate = false
    data.lateInterestInCents = 0
    data.lateFeePercent = null
    data.lateReason = null

    const updated = await this.installmentsRepository.save(data)

    return { installment: updated }
  }
}
