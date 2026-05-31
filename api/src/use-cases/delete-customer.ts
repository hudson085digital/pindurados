import { CustomersRepository } from '@/repositories/customers-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface DeleteCustomerUseCaseRequest {
  userId: string
  customerId: string
}

export class DeleteCustomerUseCase {
  constructor(private customersRepository: CustomersRepository) {}

  async execute({
    userId,
    customerId,
  }: DeleteCustomerUseCaseRequest): Promise<void> {
    const customer = await this.customersRepository.findById(customerId)
    if (!customer || customer.userId !== userId) {
      throw new ResourceNotFoundError('Devedor')
    }

    await this.customersRepository.delete(customerId)
  }
}
