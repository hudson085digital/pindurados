import { beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import * as XLSX from 'xlsx'
import { InMemoryPurchasesRepository } from '@/repositories/in-memory/in-memory-purchases-repository'
import { InMemoryStockUnitsRepository } from '@/repositories/in-memory/in-memory-stock-units-repository'
import { InMemoryProductsRepository } from '@/repositories/in-memory/in-memory-products-repository'
import { ManagePurchasesUseCase } from './manage-purchases'
import {
  ImportPurchasesUseCase,
  parseBRDate,
  parseMoneyToCents,
  parseUnitData,
} from './import-purchases'

const userId = randomUUID()

let products: InMemoryProductsRepository
let stockUnits: InMemoryStockUnitsRepository
let purchases: InMemoryPurchasesRepository
let sut: ImportPurchasesUseCase

beforeEach(() => {
  products = new InMemoryProductsRepository()
  stockUnits = new InMemoryStockUnitsRepository()
  purchases = new InMemoryPurchasesRepository(stockUnits)
  // o repositório in-memory de compras precisa conhecer os produtos criados
  const originalCreate = products.create.bind(products)
  products.create = async (data) => {
    const product = await originalCreate(data)
    purchases.seedProduct(product)
    return product
  }
  sut = new ImportPurchasesUseCase(
    new ManagePurchasesUseCase(purchases, stockUnits, products),
    products,
  )
})

// Monta um .xlsx em memória com o layout Jan–Mar da planilha real.
function buildSheet(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Janeiro')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

const HEADER_JAN = [
  'Data', 'Número do Pedido', 'Conta', 'CIA', 'Formato', 'Produto',
  'Valor Pago', 'Forma de Pagamento', 'Acumulo/Cashback', 'Frete',
  'Valor Pago (Com Frete)', 'Milhas Obtidas/Cashback Obtido', 'Valor do CPM',
  'Valor das Milhas/Cashback', 'Valor Final do Produto',
  'Valor Final do Produto (Nubank)', 'Previsão de Recebimento',
  'Data de Recebimento de Produto', 'Status do Recebimento do Produto',
  'Data Prevista de Recebimento das Milhas/Cashback',
  'Data de Recebimento das Milhas', 'Status das Milhas/Cashback',
  'Dados do Produto', 'Observação',
]

describe('parsers', () => {
  it('converte moeda em formato US para centavos', () => {
    expect(parseMoneyToCents('R$ 4,699.00')).toBe(469900)
    expect(parseMoneyToCents('R$ 9.90')).toBe(990)
    expect(parseMoneyToCents('27')).toBe(2700)
    expect(parseMoneyToCents('')).toBeNull()
  })

  it('converte datas dd/mm/yyyy e d/m/yyyy', () => {
    expect(parseBRDate('06/01/2026')).toBe('2026-01-06')
    expect(parseBRDate('7/1/2026')).toBe('2026-01-07')
    expect(parseBRDate('sem data')).toBeNull()
  })

  it('extrai SN/IMEI/DANFE do bloco Dados do Produto', () => {
    const data = parseUnitData(
      'IMEI: 355542339623201\nIMEI2: 355542339369979\nDANFE: 3526 0160 4465',
    )
    expect(data.imei1).toBe('355542339623201')
    expect(data.imei2).toBe('355542339369979')
    expect(data.danfe).toBe('35260160 4465'.replace(/\s/g, ''))
  })
})

describe('ImportPurchasesUseCase', () => {
  it('importa linha cashback real com custo, recebimento e crédito pendente', async () => {
    const buffer = buildSheet([
      HEADER_JAN,
      [
        '06/01/2026', null, '078.396.733-09', 'Inter x Magalu', 'Cashback',
        'iPhone 16 128GB Verde-acizentado', 'R$ 4,699.00', 'Pix', '13',
        'R$ 9.90', 'R$ 4,708.90', '0.00', '0', 'R$ 610.87', 'R$ 4,098.03',
        'R$ 0.00', '7/1/2026', '07/01/2026', 'RECEBIDO', '07/02/2026', null,
        'NÃO CREDITADAS', 'IMEI: 355542339623201\nIMEI2: 355542339369979', null,
      ],
    ])

    const report = await sut.execute(userId, buffer)

    expect(report.skipped).toEqual([])
    expect(report.imported).toBe(1)

    const purchase = purchases.items[0]
    expect(purchase.format).toBe('CASHBACK')
    expect(purchase.cashbackPercent).toBe(13)
    expect(purchase.expectedCreditInCents).toBe(61087)
    expect(purchase.productReceivedAt).not.toBeNull()
    expect(purchase.creditReceivedAt).toBeNull() // NÃO CREDITADAS

    const unit = stockUnits.items[0]
    expect(unit.status).toBe('AVAILABLE')
    expect(unit.imei1).toBe('355542339623201')
    expect(unit.finalCostInCents).toBe(470890) // custo original (cashback → carteira)
  })

  it('reaproveita o produto pelo nome e reporta linhas inválidas', async () => {
    const buffer = buildSheet([
      HEADER_JAN,
      ['06/01/2026', null, null, 'Shopee', 'Normal', 'JBL Boombox 4 Azul', 'R$ 2,612.52', 'Pix', '0', 'R$ 0.00'],
      ['08/01/2026', null, null, 'Mercado Livre', 'Normal', 'JBL Boombox 4 Azul', 'R$ 2,371.41', 'Pix', '0', 'R$ 0.00'],
      ['09/01/2026', null, null, 'Shopee', 'Normal', '', 'R$ 100.00'],
      ['data ruim', null, null, 'Shopee', 'Normal', 'Fonte 20w', 'R$ 76.97'],
    ])

    const report = await sut.execute(userId, buffer)

    expect(report.imported).toBe(2)
    expect(report.skipped).toHaveLength(2)
    expect(report.skipped[0].reason).toBe('sem produto')
    expect(report.skipped[1].reason).toBe('data inválida')
    expect(products.items).toHaveLength(1) // mesmo produto nas 2 compras
  })
})
