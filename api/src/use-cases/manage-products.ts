import { Prisma, Product } from '@prisma/client'
import { ProductsRepository } from '@/repositories/products-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

interface ProductInput {
  name: string
  brand?: string | null
  color?: string | null
  category?: string | null
  subcategory?: string | null
  sku?: string | null
  barcode?: string | null
  productTypeId?: string | null
  productModelId?: string | null
  suggestedPriceInCents?: number | null
  warrantyDays?: number | null
  minQuantity?: number | null
  note?: string | null
  /** Valores dos meta fields do tipo: só o que for preenchido é gravado. */
  meta?: Record<string, string | number | boolean | null>
}

export interface ProductWithCounts extends Product {
  awaitingCount: number
  availableCount: number
  soldCount: number
  belowMin: boolean
}

// CRUD do catálogo. Só o nome é obrigatório (design aberto); as contagens por
// status vêm das unidades ligadas ao produto.
export class ManageProductsUseCase {
  constructor(private productsRepository: ProductsRepository) {}

  async create(userId: string, input: ProductInput): Promise<Product> {
    return this.productsRepository.create({ userId, ...input })
  }

  async list(userId: string, search?: string): Promise<ProductWithCounts[]> {
    const products = await this.productsRepository.findManyByUserId(
      userId,
      search,
    )
    return products.map((product) => {
      const awaitingCount = product.units.filter((u) => u.status === 'AWAITING').length
      const availableCount = product.units.filter((u) => u.status === 'AVAILABLE').length
      const soldCount = product.units.filter((u) => u.status === 'SOLD').length
      const { units: _units, ...rest } = product
      return {
        ...rest,
        awaitingCount,
        availableCount,
        soldCount,
        belowMin:
          product.minQuantity != null && availableCount < product.minQuantity,
      }
    })
  }

  async update(
    userId: string,
    productId: string,
    input: Partial<ProductInput>,
  ): Promise<Product> {
    await this.ensureOwned(userId, productId)
    return this.productsRepository.update(
      productId,
      input as Prisma.ProductUpdateInput,
    )
  }

  async delete(userId: string, productId: string): Promise<void> {
    await this.ensureOwned(userId, productId)
    const units = await this.productsRepository.countUnits(productId)
    const purchases = await this.productsRepository.countPurchases(productId)
    if (units > 0 || purchases > 0) {
      throw new BusinessRuleError(
        'Este produto tem histórico de compras/unidades — não dá para excluir sem apagar o histórico.',
      )
    }
    await this.productsRepository.delete(productId)
  }

  private async ensureOwned(userId: string, productId: string) {
    const product = await this.productsRepository.findById(productId)
    if (!product || product.userId !== userId) {
      throw new ResourceNotFoundError('Produto')
    }
  }
}
