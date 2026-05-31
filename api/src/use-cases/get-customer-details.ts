import { Customer } from '@prisma/client'
import { CustomersRepository } from '@/repositories/customers-repository'
import { SalesRepository } from '@/repositories/sales-repository'
import { serializeSale, SerializedSale } from '@/utils/serialize-sale'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface GetCustomerDetailsUseCaseRequest {
  userId: string
  customerId: string
}

interface GetCustomerDetailsUseCaseResponse {
  customer: Customer
  sales: SerializedSale[]
  balanceInCents: number
}

export class GetCustomerDetailsUseCase {
  constructor(
    private customersRepository: CustomersRepository,
    private salesRepository: SalesRepository,
  ) {}

  async execute({
    userId,
    customerId,
  }: GetCustomerDetailsUseCaseRequest): Promise<GetCustomerDetailsUseCaseResponse> {
    const customer = await this.customersRepository.findById(customerId)
    if (!customer || customer.userId !== userId) {
      throw new ResourceNotFoundError('Devedor')
    }

    const sales = (
      await this.salesRepository.findManyByCustomerId(customerId)
    ).map(serializeSale)

    const balanceInCents = sales.reduce((s, v) => s + v.balanceInCents, 0)

    return { customer, sales, balanceInCents }
  }
}
