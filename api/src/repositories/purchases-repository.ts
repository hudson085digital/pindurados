import { Prisma } from '@prisma/client'

// Compra com produto e unidades (cada unidade sabe se está vendida).
export type PurchaseWithDetails = Prisma.PurchaseGetPayload<{
  include: {
    product: true
    units: { include: { saleItem: true } }
  }
}>

export interface PurchaseFilters {
  /** "YYYY-MM" — filtra pelo mês da compra. */
  month?: string
  marketplace?: string
  format?: string
  /** NOT_RECEIVED | RECEIVED — recebimento do produto. */
  productStatus?: string
  /** NOT_CREDITED | CREDITED — crédito de milhas/cashback. */
  creditStatus?: string
  search?: string
}

export interface PurchasesRepository {
  create(data: Prisma.PurchaseUncheckedCreateInput): Promise<PurchaseWithDetails>
  findById(id: string): Promise<PurchaseWithDetails | null>
  findManyByUserId(
    userId: string,
    filters?: PurchaseFilters,
  ): Promise<PurchaseWithDetails[]>
  update(
    id: string,
    data: Prisma.PurchaseUpdateInput,
  ): Promise<PurchaseWithDetails>
  /** Marca como cancelada e remove as unidades NÃO vendidas (transação). */
  cancel(id: string): Promise<void>
}
