import { CustomersRepository } from '@/repositories/customers-repository'
import { SalesRepository } from '@/repositories/sales-repository'
import { serializeSale } from '@/utils/serialize-sale'

interface FetchCustomersUseCaseRequest {
  userId: string
}

export interface CustomerWithBalance {
  id: string
  name: string
  phone: string | null
  note: string | null
  salesCount: number
  balanceInCents: number
}

interface FetchCustomersUseCaseResponse {
  customers: CustomerWithBalance[]
}

export class FetchCustomersUseCase {
  constructor(
    private customersRepository: CustomersRepository,
    private salesRepository: SalesRepository,
  ) {}

  async execute({
    userId,
  }: FetchCustomersUseCaseRequest): Promise<FetchCustomersUseCaseResponse> {
    const customers = await this.customersRepository.findManyByUserId(userId)

    const result = await Promise.all(
      customers.map(async (customer) => {
        const sales = await this.salesRepository.findManyByCustomerId(customer.id)
        const serialized = sales.map(serializeSale)
        const balanceInCents = serialized.reduce((s, v) => s + v.balanceInCents, 0)

        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          note: customer.note,
          salesCount: sales.length,
          balanceInCents,
        }
      }),
    )

    return { customers: result }
  }
}
