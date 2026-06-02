import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryInstallmentsRepository } from '@/repositories/in-memory/in-memory-installments-repository'
import { InstallmentWithSale } from '@/repositories/installments-repository'
import { UpdateInstallmentDueDateUseCase } from './update-installment-due-date'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

const USER = 'user-1'

let repo: InMemoryInstallmentsRepository
let sut: UpdateInstallmentDueDateUseCase

function seedInstallment(): InstallmentWithSale {
  const item = {
    id: 'p1',
    number: 1,
    amountInCents: 33333,
    dueDate: new Date('2026-02-01T12:00:00.000Z'),
    isLate: false,
    lateInterestInCents: 0,
    lateFeePercent: null,
    lateReason: null,
    saleId: 'sale-1',
    sale: {
      id: 'sale-1',
      customerId: 'c1',
      customer: { id: 'c1', userId: USER, name: 'X', phone: null, note: null, autoReminder: false, createdAt: new Date() },
    },
  } as unknown as InstallmentWithSale
  repo.items.push(item)
  return item
}

beforeEach(() => {
  repo = new InMemoryInstallmentsRepository()
  sut = new UpdateInstallmentDueDateUseCase(repo)
  seedInstallment()
})

describe('UpdateInstallmentDueDateUseCase', () => {
  it('edita o vencimento da parcela', async () => {
    const newDate = new Date('2026-05-15T12:00:00.000Z')
    const { installment } = await sut.execute({ userId: USER, installmentId: 'p1', dueDate: newDate })
    expect(installment.dueDate).toEqual(newDate)
    expect(repo.items[0].dueDate).toEqual(newDate)
  })

  it('não edita parcela de outro usuário', async () => {
    await expect(() =>
      sut.execute({ userId: 'outro', installmentId: 'p1', dueDate: new Date() }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
