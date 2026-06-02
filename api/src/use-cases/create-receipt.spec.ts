import { describe, it, expect, beforeEach } from 'vitest'
import { Installment } from '@prisma/client'
import { InMemorySalesRepository } from '@/repositories/in-memory/in-memory-sales-repository'
import { InMemoryReceiptsRepository } from '@/repositories/in-memory/in-memory-receipts-repository'
import { SaleWithDetails } from '@/repositories/sales-repository'
import { CreateReceiptUseCase } from './create-receipt'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

const USER_ID = 'user-1'

function makeInstallment(
  saleId: string,
  number: number,
  amountInCents: number,
  over: Partial<Installment> = {},
): Installment {
  return {
    id: `${saleId}-p${number}`,
    number,
    amountInCents,
    dueDate: new Date('2026-02-01'),
    isLate: false,
    lateInterestInCents: 0,
    lateFeePercent: null,
    lateReason: null,
    saleId,
    ...over,
  }
}

let salesRepository: InMemorySalesRepository
let receiptsRepository: InMemoryReceiptsRepository
let sut: CreateReceiptUseCase
let sale: SaleWithDetails

beforeEach(() => {
  salesRepository = new InMemorySalesRepository()
  receiptsRepository = new InMemoryReceiptsRepository(salesRepository)
  sut = new CreateReceiptUseCase(salesRepository, receiptsRepository)

  // 1000 em 3x (333,33 / 333,33 / 333,34)
  sale = InMemorySalesRepository.makeSale({
    id: 'sale-1',
    customer: {
      id: 'c1',
      name: 'Cliente',
      phone: null,
      note: null,
      autoReminder: false,
      createdAt: new Date(),
      userId: USER_ID,
    },
    customerId: 'c1',
  })
  sale.installments = [
    makeInstallment('sale-1', 1, 33333),
    makeInstallment('sale-1', 2, 33333),
    makeInstallment('sale-1', 3, 33334),
  ]
  salesRepository.seed(sale)
})

describe('CreateReceiptUseCase', () => {
  it('registra um recebimento de 500 e reflete na venda', async () => {
    const { receipt } = await sut.execute({
      userId: USER_ID,
      saleId: 'sale-1',
      amountInCents: 50000,
      method: 'CASH',
    })

    expect(receipt.amountInCents).toBe(50000)
    expect(receipt.createdBy).toBe(USER_ID)
    expect(sale.receipts).toHaveLength(1)
  })

  it('limita o recebimento ao saldo (Q2): rejeita valor acima do saldo', async () => {
    await sut.execute({ userId: USER_ID, saleId: 'sale-1', amountInCents: 50000, method: 'PIX' })

    // saldo agora é 50000; tentar 60000 deve falhar
    await expect(() =>
      sut.execute({ userId: USER_ID, saleId: 'sale-1', amountInCents: 60000, method: 'PIX' }),
    ).rejects.toBeInstanceOf(BusinessRuleError)
  })

  it('aceita receber exatamente o saldo e quita', async () => {
    await sut.execute({ userId: USER_ID, saleId: 'sale-1', amountInCents: 100000, method: 'PIX' })
    await expect(() =>
      sut.execute({ userId: USER_ID, saleId: 'sale-1', amountInCents: 1, method: 'PIX' }),
    ).rejects.toThrowError('já está quitado')
  })

  it('rejeita valor zero ou negativo', async () => {
    await expect(() =>
      sut.execute({ userId: USER_ID, saleId: 'sale-1', amountInCents: 0, method: 'PIX' }),
    ).rejects.toBeInstanceOf(BusinessRuleError)
  })

  it('não deixa receber em venda de outro usuário', async () => {
    await expect(() =>
      sut.execute({ userId: 'outro', saleId: 'sale-1', amountInCents: 1000, method: 'PIX' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
