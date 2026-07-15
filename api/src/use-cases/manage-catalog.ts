import { ProductModel, ProductType, ProductTypeField } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

// Catálogo estruturado (025): Tipo de produto → Modelos + Meta fields do tipo.
// Ex.: tipo "Celular" tem modelos "iPhone 16", "Galaxy A17" e campos IMEI,
// IMEI 2, GB, Saúde da bateria, Ciclo da bateria.

export type ProductTypeWithRelations = ProductType & {
  models: ProductModel[]
  fields: ProductTypeField[]
}

// Seeds de primeira utilização — o dono edita/apaga à vontade.
const DEFAULT_TYPES: { name: string; fields: string[]; models?: string[] }[] = [
  {
    name: 'Celular',
    fields: ['IMEI', 'IMEI 2', 'Armazenamento (GB)', 'Memória RAM', 'Saúde da bateria', 'Ciclo da bateria'],
  },
  { name: 'Caixa de Som', fields: ['Potência (W)'] },
  { name: 'Ar-condicionado', fields: ['BTUs', 'Voltagem'] },
  { name: 'TV', fields: ['Polegadas', 'Resolução'] },
  { name: 'Acessório', fields: [] },
]

export class ManageCatalogUseCase {
  /** Lista tipos com modelos e campos; semeia os padrões no primeiro uso. */
  async listTypes(userId: string): Promise<ProductTypeWithRelations[]> {
    const count = await prisma.productType.count({ where: { userId } })
    if (count === 0) {
      // Requisições simultâneas no primeiro uso podem semear em corrida —
      // cada tipo é individualmente idempotente (ignora duplicado).
      for (const t of DEFAULT_TYPES) {
        try {
          await prisma.productType.create({
            data: {
              userId,
              name: t.name,
              fields: { create: t.fields.map((label) => ({ userId, label })) },
            },
          })
        } catch {
          // já existe (corrida) — segue para o próximo
        }
      }
    }
    return prisma.productType.findMany({
      where: { userId },
      include: {
        models: { orderBy: { name: 'asc' } },
        fields: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { name: 'asc' },
    })
  }

  async createType(userId: string, name: string) {
    return prisma.productType.create({
      data: { userId, name },
      include: { models: true, fields: true },
    })
  }

  async renameType(userId: string, id: string, name: string) {
    await this.ensureTypeOwned(userId, id)
    return prisma.productType.update({
      where: { id },
      data: { name },
      include: { models: true, fields: true },
    })
  }

  async deleteType(userId: string, id: string) {
    const type = await prisma.productType.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    })
    if (!type || type.userId !== userId) {
      throw new ResourceNotFoundError('Tipo de produto')
    }
    if (type._count.products > 0) {
      throw new BusinessRuleError(
        'Há produtos usando este tipo — mova-os antes de excluir.',
      )
    }
    await prisma.productType.delete({ where: { id } })
  }

  async createModel(userId: string, productTypeId: string, name: string) {
    await this.ensureTypeOwned(userId, productTypeId)
    return prisma.productModel.create({ data: { userId, productTypeId, name } })
  }

  async renameModel(userId: string, id: string, name: string) {
    const model = await prisma.productModel.findUnique({ where: { id } })
    if (!model || model.userId !== userId) {
      throw new ResourceNotFoundError('Modelo')
    }
    // produtos apontam para o modelo por FK — o novo nome vale em todo lugar
    return prisma.productModel.update({ where: { id }, data: { name } })
  }

  async deleteModel(userId: string, id: string) {
    const model = await prisma.productModel.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    })
    if (!model || model.userId !== userId) {
      throw new ResourceNotFoundError('Modelo')
    }
    if (model._count.products > 0) {
      throw new BusinessRuleError(
        'Há produtos usando este modelo — mova-os antes de excluir.',
      )
    }
    await prisma.productModel.delete({ where: { id } })
  }

  async createField(userId: string, productTypeId: string, label: string) {
    await this.ensureTypeOwned(userId, productTypeId)
    return prisma.productTypeField.create({
      data: { userId, productTypeId, label },
    })
  }

  async deleteField(userId: string, id: string) {
    const field = await prisma.productTypeField.findUnique({ where: { id } })
    if (!field || field.userId !== userId) {
      throw new ResourceNotFoundError('Campo')
    }
    // valores já preenchidos permanecem no meta dos produtos (histórico)
    await prisma.productTypeField.delete({ where: { id } })
  }

  private async ensureTypeOwned(userId: string, id: string) {
    const type = await prisma.productType.findUnique({ where: { id } })
    if (!type || type.userId !== userId) {
      throw new ResourceNotFoundError('Tipo de produto')
    }
  }
}
