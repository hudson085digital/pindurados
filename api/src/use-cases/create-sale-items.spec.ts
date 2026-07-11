import { beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { CustomersRepository } from '@/repositories/customers-repository'
import { InMemorySalesRepository } from '@/repositories/in-memory/in-memory-sales-repository'
import { InMemoryStockUnitsRepository } from '@/repositories/in-memory/in-memory-stock-units-repository'
import { StockUnitWithDetails } from '@/repositories/stock-units-repository'
import { CreateSaleUseCase } from './create-sale'
import { DeleteSaleUseCase } from './delete-sale'
import { BusinessRuleError } from './errors/business-rule-error'

const userId = randomUUID()
const customerId = randomUUID()

// stub do repositório de devedores (só findById é usado pelo use-case)
const customersRepository = {
  findById: async (id: string) =>
    id === customerId
      ? ({ id, userId, name: 'João' } as never)
      : null,
} as unknown as CustomersRepository

function makeUnit(
  overrides: Partial<StockUnitWithDetails> = {},
): StockUnitWithDetails {
  const id = overrides.id ?? randomUUID()
  return {
    id,
    status: 'AVAILABLE',
    finalCostInCents: 207534, // JBL via milhas
    serialNumber: 'SN-1',
    imei1: null,
    imei2: null,
    danfe: null,
    note: null,
    meta: {},
    createdAt: new Date(),
    userId,
    purchaseId: randomUUID(),
    productId: randomUUID(),
    product: {
      id: randomUUID(),
      name: 'JBL Boombox 4 Preta',
      brand: 'JBL',
      color: 'Preta',
      category: null,
      subcategory: null,
      sku: null,
      barcode: null,
      productTypeId: null,
      productModelId: null,
      suggestedPriceInCents: 260000,
      warrantyDays: 90,
      minQuantity: null,
      note: null,
      meta: {},
      createdAt: new Date(),
      userId,
      productType: null,
    },
    purchase: {} as StockUnitWithDetails['purchase'],
    saleItem: null,
    ...overrides,
  }
}

let sales: InMemorySalesRepository
let stockUnits: InMemoryStockUnitsRepository
let sut: CreateSaleUseCase

beforeEach(() => {
  sales = new InMemorySalesRepository()
  stockUnits = new InMemoryStockUnitsRepository()
  sut = new CreateSaleUseCase(customersRepository, sales, stockUnits)
})

describe('CreateSaleUseCase — itens do estoque (025)', () => {
  it('deriva valor/custo dos itens, marca unidades SOLD e calcula lucro/margem', async () => {
    const unit = stockUnits.seed(makeUnit())

    const { sale } = await sut.execute({
      userId,
      customerId,
      type: 'MANUAL',
      interestPercent: 0,
      installmentsCount: 1,
      saleDate: '2026-07-10',
      items: [{ unitId: unit.id, priceInCents: 260000 }],
    })

    expect(sale.productValueInCents).toBe(260000)
    expect(sale.productCostInCents).toBe(207534)
    expect(sale.profitInCents).toBe(52466) // 2.600,00 − 2.075,34
    expect(sale.marginPercent).toBeCloseTo(20.2, 1)
    expect(sale.markupPercent).toBeCloseTo(25.3, 1)
    expect(sale.items).toHaveLength(1)
    expect(sale.items[0].nameSnapshot).toBe('JBL Boombox 4 Preta')
    // garantia: 10/07/2026 + 90 dias = 08/10/2026
    expect(sale.items[0].warrantyUntil?.toISOString().slice(0, 10)).toBe('2026-10-08')
    expect((await stockUnits.findById(unit.id))?.status).toBe('SOLD')
  })

  it('desconto por item entra no valor; unidade SOLD não vende de novo', async () => {
    const a = stockUnits.seed(makeUnit({ finalCostInCents: 1000 }))
    const b = stockUnits.seed(makeUnit({ finalCostInCents: 2000 }))

    const { sale } = await sut.execute({
      userId,
      customerId,
      type: 'MANUAL',
      interestPercent: 0,
      installmentsCount: 1,
      items: [
        { unitId: a.id, priceInCents: 3000, discountInCents: 500 },
        { unitId: b.id, priceInCents: 3000 },
      ],
    })
    expect(sale.productValueInCents).toBe(5500)
    expect(sale.productCostInCents).toBe(3000)

    await expect(
      sut.execute({
        userId,
        customerId,
        type: 'MANUAL',
        interestPercent: 0,
        items: [{ unitId: a.id, priceInCents: 3000 }],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)
  })

  it('unidade AWAITING exige allowAwaiting; desconto > preço é bloqueado', async () => {
    const unit = stockUnits.seed(makeUnit({ status: 'AWAITING' }))

    await expect(
      sut.execute({
        userId,
        customerId,
        type: 'MANUAL',
        interestPercent: 0,
        items: [{ unitId: unit.id, priceInCents: 1000 }],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    await expect(
      sut.execute({
        userId,
        customerId,
        type: 'MANUAL',
        interestPercent: 0,
        items: [
          { unitId: unit.id, priceInCents: 1000, discountInCents: 2000, allowAwaiting: true },
        ],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    const { sale } = await sut.execute({
      userId,
      customerId,
      type: 'MANUAL',
      interestPercent: 0,
      items: [{ unitId: unit.id, priceInCents: 1000, allowAwaiting: true }],
    })
    expect(sale.items).toHaveLength(1)
  })

  it('venda sem itens continua funcionando como sempre (fiado intocado)', async () => {
    const { sale } = await sut.execute({
      userId,
      customerId,
      type: 'MANUAL',
      description: 'Geladeira',
      productValueInCents: 150000,
      interestPercent: 50,
      installmentsCount: 3,
    })
    expect(sale.totalInCents).toBe(225000)
    expect(sale.items).toHaveLength(0)
    expect(sale.marginPercent).toBeNull() // sem custo, sem margem
  })

  it('venda à vista/cartão quita na hora: 1 parcela, sem juros, recibo automático', async () => {
    const unit = stockUnits.seed(makeUnit())
    const created: Record<string, unknown>[] = []
    const receiptsRepository = {
      create: async (data: Record<string, unknown>) => {
        created.push(data)
        return data
      },
    } as never

    const sutImediato = new CreateSaleUseCase(
      customersRepository,
      sales,
      stockUnits,
      receiptsRepository,
    )

    const { sale } = await sutImediato.execute({
      userId,
      customerId,
      type: 'MANUAL',
      saleDate: '2026-07-11',
      saleKind: 'À vista',
      customerKind: 'Varejo',
      items: [{ unitId: unit.id, priceInCents: 260000 }],
      immediateMethods: ['CASH'],
    })

    expect(sale.installments).toHaveLength(1)
    expect(sale.interestPercent).toBe(0)
    expect(sale.totalInCents).toBe(260000)
    expect(sale.saleKind).toBe('À vista')
    expect(sale.customerKind).toBe('Varejo')
    // descrição composta do item (sem descrição livre)
    expect(sale.description).toBe('JBL Boombox 4 Preta')
    // recibo automático do total, na data da venda, forma escolhida
    expect(created).toHaveLength(1)
    expect(created[0].amountInCents).toBe(260000)
    expect(created[0].methods).toEqual(['CASH'])
  })

  it('excluir venda devolve as unidades ao estoque', async () => {
    const unit = stockUnits.seed(makeUnit())
    const { sale } = await sut.execute({
      userId,
      customerId,
      type: 'MANUAL',
      interestPercent: 0,
      items: [{ unitId: unit.id, priceInCents: 250000 }],
    })
    expect((await stockUnits.findById(unit.id))?.status).toBe('SOLD')

    const stored = await sales.findById(sale.id)
    stored!.customer.userId = userId // garante ownership no stub

    const deleteSale = new DeleteSaleUseCase(sales, stockUnits)
    await deleteSale.execute({ userId, saleId: sale.id })

    expect((await stockUnits.findById(unit.id))?.status).toBe('AVAILABLE')
    expect(await sales.findById(sale.id)).toBeNull()
  })
})
