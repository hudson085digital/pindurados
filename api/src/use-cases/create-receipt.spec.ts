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
      methods: ['CASH'],
      receiptPath: 'comprovante.jpg',
    })

    expect(receipt.amountInCents).toBe(50000)
    expect(receipt.createdBy).toBe(USER_ID)
    expect(receipt.receiptPath).toBe('comprovante.jpg')
    expect(sale.receipts).toHaveLength(1)
  })

  it('exige o comprovante de pagamento (spec 005)', async () => {
    await expect(() =>
      sut.execute({ userId: USER_ID, saleId: 'sale-1', amountInCents: 50000, methods: ['PIX'] }),
    ).rejects.toThrowError('comprovante')
  })

  it('limita o recebimento ao saldo (Q2): rejeita valor acima do saldo', async () => {
    await sut.execute({ userId: USER_ID, saleId: 'sale-1', amountInCents: 50000, methods: ['PIX'], receiptPath: 'c.jpg' })

    // saldo agora é 50000; tentar 60000 deve falhar
    await expect(() =>
      sut.execute({ userId: USER_ID, saleId: 'sale-1', amountInCents: 60000, methods: ['PIX'], receiptPath: 'c.jpg' }),
    ).rejects.toBeInstanceOf(BusinessRuleError)
  })

  it('aceita receber exatamente o saldo e quita', async () => {
    await sut.execute({ userId: USER_ID, saleId: 'sale-1', amountInCents: 100000, methods: ['PIX'], receiptPath: 'c.jpg' })
    await expect(() =>
      sut.execute({ userId: USER_ID, saleId: 'sale-1', amountInCents: 1, methods: ['PIX'], receiptPath: 'c.jpg' }),
    ).rejects.toThrowError('já está quitado')
  })

  it('guarda o valor por forma quando há 2+ formas', async () => {
    const { receipt } = await sut.execute({
      userId: USER_ID,
      saleId: 'sale-1',
      amountInCents: 50000,
      methods: ['PIX', 'CASH'],
      methodAmountsInCents: [30000, 20000],
      receiptPath: 'c.jpg',
    })
    expect(receipt.methods).toEqual(['PIX', 'CASH'])
    expect(receipt.methodAmountsInCents).toEqual([30000, 20000])
  })

  it('rejeita quando a soma por forma difere do total', async () => {
    await expect(() =>
      sut.execute({
        userId: USER_ID,
        saleId: 'sale-1',
        amountInCents: 50000,
        methods: ['PIX', 'CASH'],
        methodAmountsInCents: [30000, 30000],
        receiptPath: 'c.jpg',
      }),
    ).rejects.toThrowError('soma dos valores por forma')
  })

  it('rejeita valor zero ou negativo', async () => {
    await expect(() =>
      sut.execute({ userId: USER_ID, saleId: 'sale-1', amountInCents: 0, methods: ['PIX'] }),
    ).rejects.toBeInstanceOf(BusinessRuleError)
  })

  it('não deixa receber em venda de outro usuário', async () => {
    await expect(() =>
      sut.execute({ userId: 'outro', saleId: 'sale-1', amountInCents: 1000, methods: ['PIX'] }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
