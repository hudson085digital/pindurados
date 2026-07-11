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
  // 025 — campos extras (para busca por CPF/tag e badge de tipo)
  kind: string | null
  cpfCnpj: string | null
  instagram: string | null
  tags: string[]
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
          kind: customer.kind,
          cpfCnpj: customer.cpfCnpj,
          instagram: customer.instagram,
          tags: customer.tags,
        }
      }),
    )

    return { customers: result }
  }
}
