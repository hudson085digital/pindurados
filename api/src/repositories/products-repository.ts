import { Prisma, Product, ProductModel, ProductType, ProductTypeField, StockUnitStatus } from '@prisma/client'

// Produto do catálogo com unidades (contagens), tipo (com campos) e modelo.
export type ProductWithUnits = Product & {
  units: { status: StockUnitStatus }[]
  productType?: (ProductType & { fields: ProductTypeField[] }) | null
  productModel?: ProductModel | null
}

export interface ProductsRepository {
  create(data: Prisma.ProductUncheckedCreateInput): Promise<Product>
  findById(id: string): Promise<Product | null>
  findManyByUserId(userId: string, search?: string): Promise<ProductWithUnits[]>
  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product>
  delete(id: string): Promise<void>
  /** Quantidade de unidades ligadas ao produto (bloqueia exclusão). */
  countUnits(productId: string): Promise<number>
  /** Quantidade de compras ligadas ao produto (bloqueia exclusão). */
  countPurchases(productId: string): Promise<number>
}
