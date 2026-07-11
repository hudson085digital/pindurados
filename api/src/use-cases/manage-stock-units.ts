import { Prisma } from '@prisma/client'
import {
  StockUnitFilters,
  StockUnitsRepository,
  StockUnitWithDetails,
} from '@/repositories/stock-units-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

export interface StockSummary {
  awaiting: { count: number; costInCents: number }
  available: { count: number; costInCents: number }
  sold: { count: number; costInCents: number }
}

// Estoque de unidades físicas: listagem com resumo por status e edição dos
// dados da peça (SN/IMEI/DANFE/observação) — nunca do custo por aqui.
export class ManageStockUnitsUseCase {
  constructor(private stockUnitsRepository: StockUnitsRepository) {}

  async list(userId: string, filters?: StockUnitFilters) {
    const units = await this.stockUnitsRepository.findManyByUserId(
      userId,
      filters,
    )

    const all = filters && (filters.status || filters.productId || filters.search)
      ? await this.stockUnitsRepository.findManyByUserId(userId)
      : units

    const summary: StockSummary = {
      awaiting: { count: 0, costInCents: 0 },
      available: { count: 0, costInCents: 0 },
      sold: { count: 0, costInCents: 0 },
    }
    for (const unit of all) {
      const bucket =
        unit.status === 'AWAITING'
          ? summary.awaiting
          : unit.status === 'AVAILABLE'
            ? summary.available
            : summary.sold
      bucket.count += 1
      bucket.costInCents += unit.finalCostInCents
    }

    return { units: units.map(serializeStockUnit), summary }
  }

  async update(
    userId: string,
    unitId: string,
    data: {
      serialNumber?: string | null
      imei1?: string | null
      imei2?: string | null
      danfe?: string | null
      note?: string | null
      meta?: Record<string, string | number | boolean | null>
    },
  ) {
    const unit = await this.stockUnitsRepository.findById(unitId)
    if (!unit || unit.userId !== userId) {
      throw new ResourceNotFoundError('Unidade de estoque')
    }
    const updated = await this.stockUnitsRepository.update(
      unitId,
      data as Prisma.StockUnitUpdateInput,
    )
    return { unit: serializeStockUnit(updated) }
  }
}

// Achata a unidade para o front: produto, compra de origem e venda (se houver).
export function serializeStockUnit(unit: StockUnitWithDetails) {
  return {
    id: unit.id,
    status: unit.status,
    finalCostInCents: unit.finalCostInCents,
    serialNumber: unit.serialNumber,
    imei1: unit.imei1,
    imei2: unit.imei2,
    danfe: unit.danfe,
    note: unit.note,
    meta: unit.meta,
    createdAt: unit.createdAt,
    product: {
      id: unit.product.id,
      name: unit.product.name,
      brand: unit.product.brand,
      color: unit.product.color,
      warrantyDays: unit.product.warrantyDays,
      suggestedPriceInCents: unit.product.suggestedPriceInCents,
      // rótulos dos meta fields do TIPO — a UI decide o que exibir por unidade
      // (ex.: IMEI só aparece em produtos de tipo com campo IMEI)
      typeFields: unit.product.productType?.fields.map((f) => f.label) ?? [],
    },
    purchase: {
      id: unit.purchaseId,
      date: unit.purchase.date,
      marketplace: unit.purchase.marketplace,
    },
    sale: unit.saleItem
      ? {
          id: unit.saleItem.sale.id,
          customerId: unit.saleItem.sale.customerId,
          customerName: unit.saleItem.sale.customer.name,
        }
      : null,
  }
}
