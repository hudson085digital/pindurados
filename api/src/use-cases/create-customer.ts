import { Customer } from '@prisma/client'
import { CustomersRepository } from '@/repositories/customers-repository'

interface CreateCustomerUseCaseRequest {
  userId: string
  name: string
  phone?: string | null
  note?: string | null
}

interface CreateCustomerUseCaseResponse {
  customer: Customer
}

export class CreateCustomerUseCase {
  constructor(private customersRepository: CustomersRepository) {}

  async execute({
    userId,
    name,
    phone,
    note,
  }: CreateCustomerUseCaseRequest): Promise<CreateCustomerUseCaseResponse> {
    const customer = await this.customersRepository.create({
      userId,
      name,
      phone: phone ?? null,
      note: note ?? null,
    })

    return { customer }
  }
}
