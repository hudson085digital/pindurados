import { Installment } from '@prisma/client'
import {
  InstallmentsRepository,
  InstallmentWithSale,
} from '../installments-repository'

export class InMemoryInstallmentsRepository implements InstallmentsRepository {
  public items: InstallmentWithSale[] = []

  async findById(id: string) {
    return this.items.find((i) => i.id === id) ?? null
  }

  async save(installment: Installment) {
    const item = this.items.find((i) => i.id === installment.id)
    if (item) Object.assign(item, installment)
    return installment
  }
}
