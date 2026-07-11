import { Prisma, StockUnitStatus } from '@prisma/client'

// Unidade com produto, compra de origem e (se vendida) a venda/cliente.
export type StockUnitWithDetails = Prisma.StockUnitGetPayload<{
  include: {
    product: { include: { productType: { include: { fields: true } } } }
    purchase: true
    saleItem: {
      include: { sale: { include: { customer: true } } }
    }
  }
}>

export interface StockUnitFilters {
  status?: StockUnitStatus
  productId?: string
  /** Busca por SN / IMEI / DANFE / nome do produto. */
  search?: string
}

export interface StockUnitsRepository {
  findById(id: string): Promise<StockUnitWithDetails | null>
  findManyByIds(ids: string[]): Promise<StockUnitWithDetails[]>
  findManyByUserId(
    userId: string,
    filters?: StockUnitFilters,
  ): Promise<StockUnitWithDetails[]>
  findManyByPurchaseId(purchaseId: string): Promise<StockUnitWithDetails[]>
  update(
    id: string,
    data: Prisma.StockUnitUpdateInput,
  ): Promise<StockUnitWithDetails>
  updateManyStatus(ids: string[], status: StockUnitStatus): Promise<void>
}
