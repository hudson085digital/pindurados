import { SalesRepository } from '@/repositories/sales-repository'
import { serializeSale } from '@/utils/serialize-sale'

interface GetSummaryUseCaseRequest {
  userId: string
}

interface GetSummaryUseCaseResponse {
  totalSoldInCents: number
  totalReceivedInCents: number
  totalToReceiveInCents: number
  salesCount: number
  settledSalesCount: number
  overdueInstallments: number
  lateInstallments: number
}

export class GetSummaryUseCase {
  constructor(private salesRepository: SalesRepository) {}

  async execute({
    userId,
  }: GetSummaryUseCaseRequest): Promise<GetSummaryUseCaseResponse> {
    const sales = (await this.salesRepository.findManyByUserId(userId)).map(
      serializeSale,
    )

    let totalSoldInCents = 0
    let totalReceivedInCents = 0
    let totalToReceiveInCents = 0
    let settledSalesCount = 0
    let overdueInstallments = 0
    let lateInstallments = 0

    for (const sale of sales) {
      totalSoldInCents += sale.totalDueInCents
      totalReceivedInCents += sale.totalPaidInCents
      totalToReceiveInCents += sale.balanceInCents
      if (sale.settled) settledSalesCount++
      for (const inst of sale.installments) {
        if (inst.overdue) overdueInstallments++
        if (inst.isLate) lateInstallments++
      }
    }

    return {
      totalSoldInCents,
      totalReceivedInCents,
      totalToReceiveInCents,
      salesCount: sales.length,
      settledSalesCount,
      overdueInstallments,
      lateInstallments,
    }
  }
}
