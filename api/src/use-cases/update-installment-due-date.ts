import { Installment } from '@prisma/client'
import { InstallmentsRepository } from '@/repositories/installments-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface UpdateInstallmentDueDateUseCaseRequest {
  userId: string
  installmentId: string
  dueDate: Date
}

interface UpdateInstallmentDueDateUseCaseResponse {
  installment: Installment
}

// Edita manualmente o vencimento de uma parcela (spec 006). Não recalcula as
// demais — é uma alteração pontual.
export class UpdateInstallmentDueDateUseCase {
  constructor(private installmentsRepository: InstallmentsRepository) {}

  async execute({
    userId,
    installmentId,
    dueDate,
  }: UpdateInstallmentDueDateUseCaseRequest): Promise<UpdateInstallmentDueDateUseCaseResponse> {
    const installment = await this.installmentsRepository.findById(installmentId)
    if (!installment || installment.sale.customer.userId !== userId) {
      throw new ResourceNotFoundError('Parcela')
    }

    const { sale: _sale, ...data } = installment
    data.dueDate = dueDate

    const updated = await this.installmentsRepository.save(data)

    return { installment: updated }
  }
}
