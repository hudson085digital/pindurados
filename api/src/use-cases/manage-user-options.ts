import { UserOption, UserOptionKind } from '@prisma/client'
import { UserOptionsRepository } from '@/repositories/user-options-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

// Listas configuráveis do dono (design aberto: nada de enum para rótulos).
// No primeiro acesso de cada tipo, semeia os padrões — dá para criar/remover.
// `meta` guarda dado extra da opção: nos formatos de compra customizados é o
// modo de CÁLCULO base (NORMAL | PROMO | MILES | CASHBACK).
const DEFAULT_OPTIONS: Record<UserOptionKind, { label: string; meta?: string }[]> = {
  MARKETPLACE: [
    { label: 'Mercado Livre' },
    { label: 'Shopee' },
    { label: 'Amazon' },
    { label: 'Magalu' },
    { label: 'FastShop' },
    { label: 'Esfera' },
  ],
  // Tipo de venda: meta define o comportamento — IMMEDIATE quita na hora
  // (1 parcela + recebimento automático); INSTALLMENTS é a promissória.
  SALE_KIND: [
    { label: 'À vista', meta: 'IMMEDIATE' },
    { label: 'Cartão', meta: 'IMMEDIATE' },
    { label: 'Promissória', meta: 'INSTALLMENTS' },
  ],
  SALE_ORIGIN: [
    { label: 'Cliente recorrente' },
    { label: 'Indicação' },
    { label: 'Parceria' },
    { label: 'Tráfego pago' },
    { label: 'Tráfego orgânico' },
  ],
  PAYMENT_METHOD: [
    { label: 'Pix' },
    { label: 'Dinheiro' },
    { label: 'Cartão' },
    { label: 'Crédito' },
    { label: 'Débito' },
    { label: 'Boleto' },
    { label: 'Transferência' },
  ],
  DELIVERY_TYPE: [
    { label: 'Retirada' },
    { label: 'Entrega' },
    { label: 'Correios' },
    { label: 'Uber' },
  ],
  PURCHASE_FORMAT: [
    { label: 'Normal', meta: 'NORMAL' },
    { label: 'Promoção', meta: 'PROMO' },
    { label: 'Milhas', meta: 'MILES' },
    { label: 'Cashback', meta: 'CASHBACK' },
  ],
  // Tipos/modelos de produto agora são ENTIDADES próprias (/product-types);
  // estes kinds ficam para rótulos simples e universais do produto.
  PRODUCT_TYPE: [],
  PRODUCT_FIELD: [],
  CUSTOMER_KIND: [{ label: 'Varejo' }, { label: 'Revenda' }],
  BRAND: [
    { label: 'Apple' },
    { label: 'Samsung' },
    { label: 'JBL' },
    { label: 'LG' },
    { label: 'Xiaomi' },
  ],
  COLOR: [
    { label: 'Preta' },
    { label: 'Branca' },
    { label: 'Azul' },
    { label: 'Verde' },
    { label: 'Laranja' },
  ],
  CATEGORY: [{ label: 'Áudio' }, { label: 'Telefonia' }, { label: 'Eletrodomésticos' }],
  SUBCATEGORY: [],
}

const ALL_KINDS = Object.keys(DEFAULT_OPTIONS) as UserOptionKind[]

export class ManageUserOptionsUseCase {
  constructor(private userOptionsRepository: UserOptionsRepository) {}

  async list(userId: string, kind?: UserOptionKind): Promise<UserOption[]> {
    const kinds: UserOptionKind[] = kind ? [kind] : ALL_KINDS
    for (const k of kinds) {
      const count = await this.userOptionsRepository.countByUserId(userId, k)
      if (count === 0) {
        await this.userOptionsRepository.createMany(
          DEFAULT_OPTIONS[k].map(({ label, meta }) => ({
            userId,
            kind: k,
            label,
            meta: meta ?? null,
          })),
        )
      }
    }
    return this.userOptionsRepository.findManyByUserId(userId, kind)
  }

  async create(
    userId: string,
    kind: UserOptionKind,
    label: string,
    meta?: string | null,
  ) {
    return this.userOptionsRepository.create({
      userId,
      kind,
      label,
      meta: meta ?? null,
    })
  }

  async delete(userId: string, id: string) {
    const option = await this.userOptionsRepository.findById(id)
    if (!option || option.userId !== userId) {
      throw new ResourceNotFoundError('Opção')
    }
    await this.userOptionsRepository.delete(id)
  }
}
