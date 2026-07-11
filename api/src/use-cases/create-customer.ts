import { Customer } from '@prisma/client'
import { CustomersRepository } from '@/repositories/customers-repository'
import { CustomerExtraFields } from './customer-extra-fields'

interface CreateCustomerUseCaseRequest extends CustomerExtraFields {
  userId: string
  name: string
  phone?: string | null
  note?: string | null
  autoReminder?: boolean
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
    autoReminder,
    ...extra
  }: CreateCustomerUseCaseRequest): Promise<CreateCustomerUseCaseResponse> {
    const customer = await this.customersRepository.create({
      userId,
      name,
      phone: phone ?? null,
      note: note ?? null,
      autoReminder: autoReminder ?? false,
      // 025 — campos extras do comprador (todos opcionais)
      kind: extra.kind ?? null,
      cpfCnpj: extra.cpfCnpj ?? null,
      instagram: extra.instagram ?? null,
      tags: extra.tags ?? [],
      addressZip: extra.addressZip ?? null,
      addressStreet: extra.addressStreet ?? null,
      addressNumber: extra.addressNumber ?? null,
      addressDistrict: extra.addressDistrict ?? null,
      addressCity: extra.addressCity ?? null,
      addressState: extra.addressState ?? null,
      addressComplement: extra.addressComplement ?? null,
    })

    return { customer }
  }
}
