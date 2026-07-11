import { Prisma, StockUnitStatus } from '@prisma/client'
import {
  StockUnitFilters,
  StockUnitsRepository,
  StockUnitWithDetails,
} from '../stock-units-repository'

export class InMemoryStockUnitsRepository implements StockUnitsRepository {
  public items: StockUnitWithDetails[] = []

  /** Atalho para os testes: insere uma unidade detalhada pronta. */
  seed(unit: StockUnitWithDetails) {
    this.items.push(unit)
    return unit
  }

  async findById(id: string) {
    return this.items.find((u) => u.id === id) ?? null
  }

  async findManyByIds(ids: string[]) {
    return this.items.filter((u) => ids.includes(u.id))
  }

  async findManyByUserId(userId: string, filters: StockUnitFilters = {}) {
    const term = filters.search?.toLowerCase()
    return this.items.filter(
      (u) =>
        u.userId === userId &&
        (!filters.status || u.status === filters.status) &&
        (!filters.productId || u.productId === filters.productId) &&
        (!term ||
          (u.serialNumber ?? '').toLowerCase().includes(term) ||
          (u.imei1 ?? '').toLowerCase().includes(term) ||
          (u.imei2 ?? '').toLowerCase().includes(term) ||
          (u.danfe ?? '').toLowerCase().includes(term) ||
          u.product.name.toLowerCase().includes(term)),
    )
  }

  async findManyByPurchaseId(purchaseId: string) {
    return this.items.filter((u) => u.purchaseId === purchaseId)
  }

  async update(id: string, data: Prisma.StockUnitUpdateInput) {
    const unit = this.items.find((u) => u.id === id)
    if (!unit) throw new Error('StockUnit not found')
    for (const key of [
      'status',
      'finalCostInCents',
      'serialNumber',
      'imei1',
      'imei2',
      'danfe',
      'note',
    ] as const) {
      if (data[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(unit as any)[key] = data[key]
      }
    }
    return unit
  }

  async updateManyStatus(ids: string[], status: StockUnitStatus) {
    for (const unit of this.items) {
      if (ids.includes(unit.id)) unit.status = status
    }
  }
}
