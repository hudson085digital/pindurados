import { Customer } from '@prisma/client'
import { CustomersRepository } from '@/repositories/customers-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { CustomerExtraFields, CUSTOMER_EXTRA_KEYS } from './customer-extra-fields'

interface UpdateCustomerUseCaseRequest extends CustomerExtraFields {
  userId: string
  customerId: string
  name?: string
  phone?: string | null
  note?: string | null
  autoReminder?: boolean
}

interface UpdateCustomerUseCaseResponse {
  customer: Customer
}

export class UpdateCustomerUseCase {
  constructor(private customersRepository: CustomersRepository) {}

  async execute({
    userId,
    customerId,
    name,
    phone,
    note,
    autoReminder,
    ...extra
  }: UpdateCustomerUseCaseRequest): Promise<UpdateCustomerUseCaseResponse> {
    const customer = await this.customersRepository.findById(customerId)
    if (!customer || customer.userId !== userId) {
      throw new ResourceNotFoundError('Devedor')
    }

    if (name !== undefined) customer.name = name
    if (phone !== undefined) customer.phone = phone
    if (note !== undefined) customer.note = note
    if (autoReminder !== undefined) customer.autoReminder = autoReminder

    // 025 — campos extras do comprador (só os enviados)
    for (const key of CUSTOMER_EXTRA_KEYS) {
      if (extra[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(customer as any)[key] = extra[key]
      }
    }

    const updated = await this.customersRepository.save(customer)

    return { customer: updated }
  }
}
