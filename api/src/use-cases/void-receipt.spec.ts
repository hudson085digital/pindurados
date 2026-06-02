import { describe, it, expect, beforeEach } from 'vitest'
import { InMemorySalesRepository } from '@/repositories/in-memory/in-memory-sales-repository'
import { InMemoryReceiptsRepository } from '@/repositories/in-memory/in-memory-receipts-repository'
import { CreateReceiptUseCase } from './create-receipt'
import { VoidReceiptUseCase } from './void-receipt'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'
import { sumReceipts } from '@/utils/allocate-receipts'

const USER_ID = 'user-1'

let salesRepository: InMemorySalesRepository
let receiptsRepository: InMemoryReceiptsRepository
let create: CreateReceiptUseCase
let sut: VoidReceiptUseCase

beforeEach(() => {
  salesRepository = new InMemorySalesRepository()
  receiptsRepository = new InMemoryReceiptsRepository(salesRepository)
  create = new CreateReceiptUseCase(salesRepository, receiptsRepository)
  sut = new VoidReceiptUseCase(receiptsRepository)

  const sale = InMemorySalesRepository.makeSale({
    id: 'sale-1',
    customerId: 'c1',
    customer: {
      id: 'c1',
      name: 'Cliente',
      phone: null,
      note: null,
      autoReminder: false,
      createdAt: new Date(),
      userId: USER_ID,
    },
  })
  sale.installments = [
    {
      id: 'p1',
      number: 1,
      amountInCents: 100000,
      dueDate: new Date('2026-02-01'),
      isLate: false,
      lateInterestInCents: 0,
      lateFeePercent: null,
      lateReason: null,
      saleId: 'sale-1',
    },
  ]
  salesRepository.seed(sale)
})

describe('VoidReceiptUseCase', () => {
  it('estorna um recebimento criando um lançamento negativo e zerando o recebido', async () => {
    const { receipt } = await create.execute({
      userId: USER_ID,
      saleId: 'sale-1',
      amountInCents: 50000,
      method: 'PIX',
    })

    const { receipt: reversal } = await sut.execute({ userId: USER_ID, receiptId: receipt.id })

    expect(reversal.amountInCents).toBe(-50000)
    expect(reversal.reversesReceiptId).toBe(receipt.id)

    const sale = await salesRepository.findById('sale-1')
    expect(sumReceipts(sale!.receipts)).toBe(0) // nada foi apagado; soma volta a zero
    expect(sale!.receipts).toHaveLength(2)
  })

  it('não estorna o mesmo recebimento duas vezes', async () => {
    const { receipt } = await create.execute({
      userId: USER_ID,
      saleId: 'sale-1',
      amountInCents: 50000,
      method: 'PIX',
    })
    await sut.execute({ userId: USER_ID, receiptId: receipt.id })

    await expect(() =>
      sut.execute({ userId: USER_ID, receiptId: receipt.id }),
    ).rejects.toThrowError('já foi estornado')
  })

  it('não estorna um estorno', async () => {
    const { receipt } = await create.execute({
      userId: USER_ID,
      saleId: 'sale-1',
      amountInCents: 50000,
      method: 'PIX',
    })
    const { receipt: reversal } = await sut.execute({ userId: USER_ID, receiptId: receipt.id })

    await expect(() =>
      sut.execute({ userId: USER_ID, receiptId: reversal.id }),
    ).rejects.toBeInstanceOf(BusinessRuleError)
  })

  it('não estorna recebimento de outro usuário', async () => {
    const { receipt } = await create.execute({
      userId: USER_ID,
      saleId: 'sale-1',
      amountInCents: 50000,
      method: 'PIX',
    })
    await expect(() =>
      sut.execute({ userId: 'outro', receiptId: receipt.id }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
