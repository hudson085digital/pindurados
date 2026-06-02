import { SalesRepository } from '@/repositories/sales-repository'
import { serializeSale } from '@/utils/serialize-sale'
import { buildDashboard, DashboardData } from '@/utils/build-dashboard'

interface GetDashboardUseCaseRequest {
  userId: string
}

export class GetDashboardUseCase {
  constructor(private salesRepository: SalesRepository) {}

  async execute({ userId }: GetDashboardUseCaseRequest): Promise<DashboardData> {
    const sales = (await this.salesRepository.findManyByUserId(userId)).map(serializeSale)
    return buildDashboard(sales)
  }
}
