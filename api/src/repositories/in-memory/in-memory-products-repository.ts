import { Prisma, Product } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { ProductsRepository, ProductWithUnits } from '../products-repository'

export class InMemoryProductsRepository implements ProductsRepository {
  public items: ProductWithUnits[] = []

  async create(data: Prisma.ProductUncheckedCreateInput): Promise<Product> {
    const product: ProductWithUnits = {
      id: data.id ?? randomUUID(),
      name: data.name,
      brand: data.brand ?? null,
      color: data.color ?? null,
      category: data.category ?? null,
      subcategory: data.subcategory ?? null,
      sku: data.sku ?? null,
      barcode: data.barcode ?? null,
      productTypeId: data.productTypeId ?? null,
      productModelId: data.productModelId ?? null,
      suggestedPriceInCents: data.suggestedPriceInCents ?? null,
      warrantyDays: data.warrantyDays ?? null,
      minQuantity: data.minQuantity ?? null,
      note: data.note ?? null,
      meta: (data.meta as ProductWithUnits['meta']) ?? {},
      createdAt: new Date(),
      userId: data.userId,
      units: [],
    }
    this.items.push(product)
    return product
  }

  async findById(id: string) {
    return this.items.find((p) => p.id === id) ?? null
  }

  async findManyByUserId(userId: string, search?: string) {
    const term = search?.toLowerCase()
    return this.items.filter(
      (p) =>
        p.userId === userId &&
        (!term ||
          p.name.toLowerCase().includes(term) ||
          (p.brand ?? '').toLowerCase().includes(term)),
    )
  }

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    const product = this.items.find((p) => p.id === id)
    if (!product) throw new Error('Product not found')
    Object.assign(product, data)
    return product
  }

  async delete(id: string) {
    this.items = this.items.filter((p) => p.id !== id)
  }

  async countUnits(productId: string) {
    const product = this.items.find((p) => p.id === productId)
    return product?.units.length ?? 0
  }

  async countPurchases() {
    return 0
  }
}
