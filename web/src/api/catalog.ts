import { api } from '@/lib/axios'
import { ProductTypeEntity } from './types'

// Catálogo estruturado: tipos de produto (com modelos e meta fields do tipo).
export async function fetchProductTypes() {
  const response = await api.get<{ types: ProductTypeEntity[] }>('/product-types')
  return response.data.types
}

export async function createProductType(name: string) {
  const response = await api.post('/product-types', { name })
  return response.data.type
}

export async function deleteProductType(id: string) {
  await api.delete(`/product-types/${id}`)
}

export async function createProductModel(typeId: string, name: string) {
  const response = await api.post(`/product-types/${typeId}/models`, { name })
  return response.data.model
}

export async function deleteProductModel(id: string) {
  await api.delete(`/product-models/${id}`)
}

export async function createProductTypeField(typeId: string, label: string) {
  const response = await api.post(`/product-types/${typeId}/fields`, { label })
  return response.data.field
}

export async function deleteProductTypeField(id: string) {
  await api.delete(`/product-type-fields/${id}`)
}
