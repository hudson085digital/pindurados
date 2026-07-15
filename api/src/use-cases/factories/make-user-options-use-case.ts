import { UserOptionKind } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PrismaUserOptionsRepository } from '@/repositories/prisma/prisma-user-options-repository'
import { ManageUserOptionsUseCase } from '../manage-user-options'

// Campos do produto que guardam o RÓTULO da opção (string, não FK) — ao
// renomear a opção, os produtos existentes acompanham o novo nome.
const PRODUCT_LABEL_FIELDS: Partial<Record<UserOptionKind, string>> = {
  BRAND: 'brand',
  COLOR: 'color',
  CATEGORY: 'category',
  SUBCATEGORY: 'subcategory',
}

export function makeUserOptionsUseCase() {
  return new ManageUserOptionsUseCase(
    new PrismaUserOptionsRepository(),
    async (userId, kind, from, to) => {
      const field = PRODUCT_LABEL_FIELDS[kind]
      if (!field) return
      await prisma.product.updateMany({
        where: { userId, [field]: from },
        data: { [field]: to },
      })
    },
  )
}
