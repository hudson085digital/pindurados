import { describe, it, expect, beforeEach } from 'vitest'
import { InMemorySalesRepository } from '@/repositories/in-memory/in-memory-sales-repository'
import { InMemoryReceiptsRepository } from '@/repositories/in-memory/in-memory-receipts-repository'
import { CreateReceiptUseCase } from './create-receipt'
import { UpdateSaleUseCase } from './update-sale'
import { serializeSale } from '@/utils/serialize-sale'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

const USER = 'user-1'
const CUSTOMER = {
  id: 'c1',
  name: 'Cliente',
  phone: null,
  note: null,
  autoReminder: false,
  createdAt: new Date(),
  userId: USER,
}

let repo: InMemorySalesRepository
let receiptsRepo: InMemoryReceiptsRepository
let createReceipt: CreateReceiptUseCase
let sut: UpdateSaleUseCase

beforeEach(() => {
  repo = new InMemorySalesRepository()
  receiptsRepo = new InMemoryReceiptsRepository(repo)
  createReceipt = new CreateReceiptUseCase(repo, receiptsRepo)
  sut = new UpdateSaleUseCase(repo)
  repo.seed(
    InMemorySalesRepository.makeSale({
      id: 'sale-1',
      customerId: 'c1',
      customer: CUSTOMER,
      totalInCents: 100000,
      productCostInCents: 60000,
    }),
  )
})

describe('UpdateSaleUseCase', () => {
  it('edita custo e o lucro previsto reflete (SC-001)', async () => {
    const { sale } = await sut.execute({ userId: USER, saleId: 'sale-1', productCostInCents: 40000 })
    expect(sale.productCostInCents).toBe(40000)
    expect(sale.profitInCents).toBe(60000) // 100000 - 40000
  })

  it('edita descrição', async () => {
    const { sale } = await sut.execute({ userId: USER, saleId: 'sale-1', description: 'Nova desc' })
    expect(sale.description).toBe('Nova desc')
  })

  it('rejeita custo negativo', async () => {
    await expect(() =>
      sut.execute({ userId: USER, saleId: 'sale-1', productCostInCents: -1 }),
    ).rejects.toBeInstanceOf(BusinessRuleError)
  })

  it('não edita venda de outro usuário', async () => {
    await expect(() =>
      sut.execute({ userId: 'outro', saleId: 'sale-1', description: 'x' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})

describe('UpdateSaleUseCase — reparcelamento', () => {
  beforeEach(async () => {
    // Venda 1000 em 2x de 500; cliente já pagou 500 (1ª parcela).
    const sale = repo.items.find((s) => s.id === 'sale-1')!
    sale.installments = [
      { id: 'p1', number: 1, amountInCents: 50000, dueDate: new Date('2026-03-10T12:00:00Z'), isLate: false, lateInterestInCents: 0, lateFeePercent: null, lateReason: null, saleId: 'sale-1' },
      { id: 'p2', number: 2, amountInCents: 50000, dueDate: new Date('2026-04-10T12:00:00Z'), isLate: false, lateInterestInCents: 0, lateFeePercent: null, lateReason: null, saleId: 'sale-1' },
    ]
    await createReceipt.execute({ userId: USER, saleId: 'sale-1', amountInCents: 50000, method: 'PIX', receiptPath: 'c.jpg' })
  })

  it('reparcela para 1200 em 3x mantendo o que foi pago (balance 700)', async () => {
    const { sale } = await sut.execute({
      userId: USER,
      saleId: 'sale-1',
      type: 'MANUAL',
      productValueInCents: 100000,
      interestPercent: 20, // total 1200
      installmentsCount: 3,
    })
    expect(sale.totalInCents).toBe(120000)
    expect(sale.installments).toHaveLength(3)
    expect(sale.installments.map((i) => i.amountInCents)).toEqual([40000, 40000, 40000])
    // 500 já recebidos cascateiam nas novas parcelas → saldo 700
    expect(sale.balanceInCents).toBe(70000)
    expect(sale.installments[0].status).toBe('PAID')
    expect(sale.installments[1].status).toBe('PARTIAL')
  })

  it('bloqueia reparcelamento abaixo do já recebido', async () => {
    await expect(() =>
      sut.execute({
        userId: USER,
        saleId: 'sale-1',
        type: 'MANUAL',
        productValueInCents: 30000,
        interestPercent: 0, // total 300 < 500 recebidos
        installmentsCount: 2,
      }),
    ).rejects.toThrowError('não pode ser menor que o já recebido')
  })

  it('a alocação após reparcelar bate com serializeSale', async () => {
    const { sale } = await sut.execute({
      userId: USER,
      saleId: 'sale-1',
      type: 'MANUAL',
      productValueInCents: 100000,
      interestPercent: 20,
      installmentsCount: 3,
    })
    const reFetched = await repo.findById('sale-1')
    expect(serializeSale(reFetched!).balanceInCents).toBe(sale.balanceInCents)
  })
})
