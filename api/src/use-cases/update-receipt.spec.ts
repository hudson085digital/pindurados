import { describe, it, expect, beforeEach } from 'vitest'
import { InMemorySalesRepository } from '@/repositories/in-memory/in-memory-sales-repository'
import { InMemoryReceiptsRepository } from '@/repositories/in-memory/in-memory-receipts-repository'
import { CreateReceiptUseCase } from './create-receipt'
import { VoidReceiptUseCase } from './void-receipt'
import { UpdateReceiptUseCase } from './update-receipt'
import { BusinessRuleError } from './errors/business-rule-error'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { sumReceipts } from '@/utils/allocate-receipts'

const USER = 'user-1'

let salesRepository: InMemorySalesRepository
let receiptsRepository: InMemoryReceiptsRepository
let create: CreateReceiptUseCase
let voidUC: VoidReceiptUseCase
let sut: UpdateReceiptUseCase

beforeEach(() => {
  salesRepository = new InMemorySalesRepository()
  receiptsRepository = new InMemoryReceiptsRepository(salesRepository)
  create = new CreateReceiptUseCase(salesRepository, receiptsRepository)
  voidUC = new VoidReceiptUseCase(receiptsRepository)
  sut = new UpdateReceiptUseCase(salesRepository, receiptsRepository)

  const sale = InMemorySalesRepository.makeSale({
    id: 'sale-1',
    customerId: 'c1',
    customer: {
      id: 'c1',
      name: 'Cliente',
      phone: null,
      note: null,
      autoReminder: false,
        kind: null,
        cpfCnpj: null,
        instagram: null,
        tags: [],
        addressZip: null,
        addressStreet: null,
        addressNumber: null,
        addressDistrict: null,
        addressCity: null,
        addressState: null,
        addressComplement: null,
      createdAt: new Date(),
      userId: USER,
    },
  })
  sale.installments = [
    { id: 'p1', number: 1, amountInCents: 100000, dueDate: new Date('2026-02-01'), isLate: false, lateInterestInCents: 0, lateFeePercent: null, lateReason: null, saleId: 'sale-1' },
  ]
  salesRepository.seed(sale)
})

describe('UpdateReceiptUseCase', () => {
  it('edita valor, data e observação', async () => {
    const { receipt } = await create.execute({ userId: USER, saleId: 'sale-1', amountInCents: 30000, methods: ['PIX'], receiptPath: 'c.jpg' })
    const { receipt: updated } = await sut.execute({
      userId: USER,
      receiptId: receipt.id,
      amountInCents: 40000,
      note: 'corrigido',
    })
    expect(updated.amountInCents).toBe(40000)
    expect(updated.note).toBe('corrigido')
    const sale = await salesRepository.findById('sale-1')
    expect(sumReceipts(sale!.receipts)).toBe(40000)
  })

  it('mantém o comprovante quando não envia novo arquivo', async () => {
    const { receipt } = await create.execute({ userId: USER, saleId: 'sale-1', amountInCents: 30000, methods: ['PIX'], receiptPath: 'orig.jpg' })
    const { receipt: updated } = await sut.execute({ userId: USER, receiptId: receipt.id, amountInCents: 35000 })
    expect(updated.receiptPath).toBe('orig.jpg')
  })

  it('bloqueia valor acima do saldo', async () => {
    const { receipt } = await create.execute({ userId: USER, saleId: 'sale-1', amountInCents: 30000, methods: ['PIX'], receiptPath: 'c.jpg' })
    await expect(() =>
      sut.execute({ userId: USER, receiptId: receipt.id, amountInCents: 150000 }),
    ).rejects.toBeInstanceOf(BusinessRuleError)
  })

  it('não edita um estorno', async () => {
    const { receipt } = await create.execute({ userId: USER, saleId: 'sale-1', amountInCents: 30000, methods: ['PIX'], receiptPath: 'c.jpg' })
    const { receipt: reversal } = await voidUC.execute({ userId: USER, receiptId: receipt.id })
    await expect(() =>
      sut.execute({ userId: USER, receiptId: reversal.id, amountInCents: 100 }),
    ).rejects.toBeInstanceOf(BusinessRuleError)
  })

  it('não edita recebimento já estornado', async () => {
    const { receipt } = await create.execute({ userId: USER, saleId: 'sale-1', amountInCents: 30000, methods: ['PIX'], receiptPath: 'c.jpg' })
    await voidUC.execute({ userId: USER, receiptId: receipt.id })
    await expect(() =>
      sut.execute({ userId: USER, receiptId: receipt.id, amountInCents: 100 }),
    ).rejects.toThrowError('já estornado')
  })

  it('não edita recebimento de outro usuário', async () => {
    const { receipt } = await create.execute({ userId: USER, saleId: 'sale-1', amountInCents: 30000, methods: ['PIX'], receiptPath: 'c.jpg' })
    await expect(() =>
      sut.execute({ userId: 'outro', receiptId: receipt.id, amountInCents: 100 }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
