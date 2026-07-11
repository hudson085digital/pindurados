import { api } from '@/lib/axios'
import { ProductWithCounts } from './types'

export interface ProductBody {
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
  meta?: Record<string, string | number | boolean | null>
}

export async function fetchProducts(search?: string) {
  const response = await api.get<{ products: ProductWithCounts[] }>('/products', {
    params: search ? { search } : undefined,
  })
  return response.data.products
}

export async function createProduct(body: ProductBody) {
  const response = await api.post('/products', body)
  return response.data.product
}

export async function updateProduct(id: string, body: Partial<ProductBody>) {
  const response = await api.put(`/products/${id}`, body)
  return response.data.product
}

export async function deleteProduct(id: string) {
  await api.delete(`/products/${id}`)
}
