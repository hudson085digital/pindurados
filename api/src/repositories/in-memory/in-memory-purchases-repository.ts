import { Prisma, Product, StockUnit } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import {
  PurchaseFilters,
  PurchasesRepository,
  PurchaseWithDetails,
} from '../purchases-repository'
import { InMemoryStockUnitsRepository } from './in-memory-stock-units-repository'

// Compra em memória. Se receber um InMemoryStockUnitsRepository, as unidades
// criadas via nested `units.create` também são registradas lá (como no Prisma).
export class InMemoryPurchasesRepository implements PurchasesRepository {
  public items: PurchaseWithDetails[] = []
  public products: Product[] = []

  constructor(private stockUnits?: InMemoryStockUnitsRepository) {}

  /** Atalho para os testes: registra o produto usado nas compras. */
  seedProduct(product: Product) {
    this.products.push(product)
    return product
  }

  async create(
    data: Prisma.PurchaseUncheckedCreateInput,
  ): Promise<PurchaseWithDetails> {
    const product = this.products.find((p) => p.id === data.productId)
    if (!product) throw new Error('Product not found (seedProduct primeiro)')

    const nested = (data.units as { create?: unknown } | undefined)?.create
    const unitInputs = Array.isArray(nested) ? nested : nested ? [nested] : []

    const purchaseId = data.id ?? randomUUID()
    const units = unitInputs.map((raw) => {
      const u = raw as Partial<StockUnit>
      const unit = {
        id: u.id ?? randomUUID(),
        status: u.status ?? 'AWAITING',
        finalCostInCents: u.finalCostInCents ?? 0,
        serialNumber: u.serialNumber ?? null,
        imei1: u.imei1 ?? null,
        imei2: u.imei2 ?? null,
        danfe: u.danfe ?? null,
        note: u.note ?? null,
        meta: u.meta ?? {},
        createdAt: new Date(),
        userId: data.userId,
        purchaseId,
        productId: data.productId,
        saleItem: null,
      }
      return unit
    })

    const purchase: PurchaseWithDetails = {
      id: purchaseId,
      date: new Date(data.date as string | Date),
      orderNumber: data.orderNumber ?? null,
      account: data.account ?? null,
      marketplace: data.marketplace ?? null,
      format: (data.format as PurchaseWithDetails['format']) ?? 'NORMAL',
      formatLabel: data.formatLabel ?? null,
      quantity: data.quantity ?? 1,
      unitValueInCents: data.unitValueInCents,
      freightInCents: data.freightInCents ?? 0,
      paymentMethod: data.paymentMethod ?? null,
      bankCard: data.bankCard ?? null,
      accrualPerReal: data.accrualPerReal ?? null,
      cpmInCents: data.cpmInCents ?? null,
      cashbackPercent: data.cashbackPercent ?? null,
      expectedCreditInCents: data.expectedCreditInCents ?? 0,
      actualCreditInCents: data.actualCreditInCents ?? null,
      nubankAdvance: data.nubankAdvance ?? false,
      nubankDiscountPercent: data.nubankDiscountPercent ?? 4.5,
      productExpectedAt: data.productExpectedAt
        ? new Date(data.productExpectedAt as string | Date)
        : null,
      productReceivedAt: data.productReceivedAt
        ? new Date(data.productReceivedAt as string | Date)
        : null,
      creditExpectedAt: data.creditExpectedAt
        ? new Date(data.creditExpectedAt as string | Date)
        : null,
      creditReceivedAt: data.creditReceivedAt
        ? new Date(data.creditReceivedAt as string | Date)
        : null,
      note: data.note ?? null,
      canceled: data.canceled ?? false,
      createdAt: new Date(),
      userId: data.userId,
      productId: data.productId,
      product,
      units,
    }

    this.items.push(purchase)

    // espelha as unidades no repositório de unidades (como o Prisma faria)
    if (this.stockUnits) {
      for (const unit of units) {
        this.stockUnits.seed({
          ...unit,
          product: { ...product, productType: null },
          purchase,
          saleItem: null,
        })
      }
    }

    return purchase
  }

  async findById(id: string) {
    return this.items.find((p) => p.id === id) ?? null
  }

  async findManyByUserId(userId: string, filters: PurchaseFilters = {}) {
    return this.items.filter((p) => {
      if (p.userId !== userId) return false
      if (filters.month) {
        const ym = `${p.date.getUTCFullYear()}-${String(p.date.getUTCMonth() + 1).padStart(2, '0')}`
        if (ym !== filters.month) return false
      }
      if (filters.marketplace && p.marketplace !== filters.marketplace) return false
      if (filters.format && p.format !== filters.format) return false
      if (filters.productStatus === 'RECEIVED' && !p.productReceivedAt) return false
      if (
        filters.productStatus === 'NOT_RECEIVED' &&
        (p.productReceivedAt || p.canceled)
      )
        return false
      if (filters.creditStatus === 'CREDITED' && !p.creditReceivedAt) return false
      if (
        filters.creditStatus === 'NOT_CREDITED' &&
        (p.creditReceivedAt || p.canceled || !['MILES', 'CASHBACK'].includes(p.format))
      )
        return false
      return true
    })
  }

  async update(id: string, data: Prisma.PurchaseUpdateInput) {
    const purchase = this.items.find((p) => p.id === id)
    if (!purchase) throw new Error('Purchase not found')
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue
      if (
        [
          'date',
          'productExpectedAt',
          'productReceivedAt',
          'creditExpectedAt',
          'creditReceivedAt',
        ].includes(key) &&
        value !== null
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(purchase as any)[key] = new Date(value as string | Date)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(purchase as any)[key] = value
      }
    }
    return purchase
  }

  async cancel(id: string) {
    const purchase = this.items.find((p) => p.id === id)
    if (!purchase) throw new Error('Purchase not found')
    purchase.canceled = true
    purchase.units = purchase.units.filter((u) => u.saleItem !== null)
    if (this.stockUnits) {
      this.stockUnits.items = this.stockUnits.items.filter(
        (u) => u.purchaseId !== id || u.saleItem !== null,
      )
    }
  }
}
