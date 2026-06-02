import { Installment } from '@prisma/client'
import { InstallmentsRepository } from '@/repositories/installments-repository'
import { SalesRepository } from '@/repositories/sales-repository'
import { allocateReceipts, sumReceipts } from '@/utils/allocate-receipts'
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
  constructor(
    private installmentsRepository: InstallmentsRepository,
    private salesRepository: SalesRepository,
  ) {}

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

    // FR-011: o juros incide sobre o PRINCIPAL EM ABERTO desta parcela. Pagamentos
    // adiantados já alocados aqui (cascata) reduzem essa base.
    const fullSale = await this.salesRepository.findById(data.saleId)
    let outstandingPrincipal = data.amountInCents
    if (fullSale) {
      const ordered = fullSale.installments.slice().sort((a, b) => a.number - b.number)
      const allocation = allocateReceipts(
        ordered.map((inst) => ({
          amountInCents: inst.amountInCents,
          // ignora o atraso desta própria parcela ao medir o principal já pago
          isLate: inst.id === data.id ? false : inst.isLate,
          lateInterestInCents: inst.lateInterestInCents,
        })),
        sumReceipts(fullSale.receipts),
      )
      const idx = ordered.findIndex((inst) => inst.id === data.id)
      if (idx >= 0) {
        outstandingPrincipal = allocation.installments[idx].balanceInCents
      }
    }

    data.isLate = true
    data.lateFeePercent = fee
    // Juros de atraso: % sobre o principal em aberto, uma única vez (não acumula).
    data.lateInterestInCents = Math.round(Math.max(0, outstandingPrincipal) * (fee / 100))
    data.lateReason = reason ?? null

    const updated = await this.installmentsRepository.save(data)

    return { installment: updated }
  }
}
