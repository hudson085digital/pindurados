import { describe, it, expect, beforeEach } from 'vitest'
import { InMemorySalesRepository } from '@/repositories/in-memory/in-memory-sales-repository'
import { UpdateSaleUseCase } from './update-sale'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

const USER = 'user-1'

let repo: InMemorySalesRepository
let sut: UpdateSaleUseCase

beforeEach(() => {
  repo = new InMemorySalesRepository()
  sut = new UpdateSaleUseCase(repo)
  repo.seed(
    InMemorySalesRepository.makeSale({
      id: 'sale-1',
      customerId: 'c1',
      customer: {
        id: 'c1',
        name: 'Cliente',
        phone: null,
        note: null,
        autoReminder: false,
        createdAt: new Date(),
        userId: USER,
      },
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
