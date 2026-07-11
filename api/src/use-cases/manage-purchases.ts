import { Prisma, PurchaseFormat } from '@prisma/client'
import {
  PurchaseFilters,
  PurchasesRepository,
  PurchaseWithDetails,
} from '@/repositories/purchases-repository'
import { StockUnitsRepository } from '@/repositories/stock-units-repository'
import { ProductsRepository } from '@/repositories/products-repository'
import { calculatePurchaseCost } from './purchase-cost'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { BusinessRuleError } from './errors/business-rule-error'

export interface PurchaseInput {
  productId: string
  date: string // ISO
  quantity?: number
  unitValueInCents: number
  freightInCents?: number
  orderNumber?: string | null
  account?: string | null
  marketplace?: string | null
  format?: PurchaseFormat
  /** Rótulo exibido do formato (configurável); `format` é o modo de cálculo. */
  formatLabel?: string | null
  paymentMethod?: string | null
  bankCard?: string | null
  accrualPerReal?: number | null
  cpmInCents?: number | null
  cashbackPercent?: number | null
  nubankAdvance?: boolean
  nubankDiscountPercent?: number
  productExpectedAt?: string | null
  creditExpectedAt?: string | null
  note?: string | null
}

// Lançamento na carteira de cashback (injeção mínima para testabilidade).
export interface WalletEntriesWriter {
  create(data: {
    userId: string
    purchaseId: string
    amountInCents: number
    kind: string
    note: string | null
  }): Promise<unknown>
}

// Compra serializada com os derivados de custo e status.
export interface SerializedPurchase
  extends Omit<PurchaseWithDetails, 'units'> {
  units: PurchaseWithDetails['units']
  paidWithFreightInCents: number
  finalCostInCents: number
  finalCostNubankInCents: number | null
  unitFinalCostInCents: number
  productStatus: 'NOT_RECEIVED' | 'RECEIVED' | 'LATE'
  creditStatus: 'NOT_CREDITED' | 'CREDITED' | 'LATE' | 'N_A'
}

function costOf(purchase: PurchaseWithDetails) {
  return calculatePurchaseCost({
    format: purchase.format,
    quantity: purchase.quantity,
    unitValueInCents: purchase.unitValueInCents,
    freightInCents: purchase.freightInCents,
    accrualPerReal: purchase.accrualPerReal,
    cpmInCents: purchase.cpmInCents,
    cashbackPercent: purchase.cashbackPercent,
    actualCreditInCents: purchase.actualCreditInCents,
    nubankAdvance: purchase.nubankAdvance,
    nubankDiscountPercent: purchase.nubankDiscountPercent,
  })
}

export function serializePurchase(
  purchase: PurchaseWithDetails,
): SerializedPurchase {
  const cost = costOf(purchase)
  const today = new Date()

  const productStatus = purchase.productReceivedAt
    ? 'RECEIVED'
    : purchase.productExpectedAt && purchase.productExpectedAt < today
      ? 'LATE'
      : 'NOT_RECEIVED'

  const hasCredit =
    purchase.format === 'MILES' || purchase.format === 'CASHBACK'
  const creditStatus = !hasCredit
    ? 'N_A'
    : purchase.creditReceivedAt
      ? 'CREDITED'
      : purchase.creditExpectedAt && purchase.creditExpectedAt < today
        ? 'LATE'
        : 'NOT_CREDITED'

  return {
    ...purchase,
    paidWithFreightInCents: cost.paidWithFreightInCents,
    finalCostInCents: cost.finalCostInCents,
    finalCostNubankInCents: cost.finalCostNubankInCents,
    unitFinalCostInCents: cost.unitCostsInCents[cost.unitCostsInCents.length - 1],
    productStatus,
    creditStatus,
  }
}

export class ManagePurchasesUseCase {
  constructor(
    private purchasesRepository: PurchasesRepository,
    private stockUnitsRepository: StockUnitsRepository,
    private productsRepository: ProductsRepository,
    // Opcional: carteira de cashback (crédito confirmado vira saldo).
    private walletEntries?: WalletEntriesWriter,
  ) {}

  async create(userId: string, input: PurchaseInput) {
    const product = await this.productsRepository.findById(input.productId)
    if (!product || product.userId !== userId) {
      throw new ResourceNotFoundError('Produto')
    }

    const quantity = Math.max(1, input.quantity ?? 1)
    const cost = calculatePurchaseCost({
      format: input.format ?? 'NORMAL',
      quantity,
      unitValueInCents: input.unitValueInCents,
      freightInCents: input.freightInCents,
      accrualPerReal: input.accrualPerReal,
      cpmInCents: input.cpmInCents,
      cashbackPercent: input.cashbackPercent,
      nubankAdvance: input.nubankAdvance,
      nubankDiscountPercent: input.nubankDiscountPercent,
    })

    const purchase = await this.purchasesRepository.create({
      userId,
      productId: input.productId,
      date: new Date(input.date),
      quantity,
      unitValueInCents: input.unitValueInCents,
      freightInCents: input.freightInCents ?? 0,
      orderNumber: input.orderNumber ?? null,
      account: input.account ?? null,
      marketplace: input.marketplace ?? null,
      format: input.format ?? 'NORMAL',
      formatLabel: input.formatLabel ?? null,
      paymentMethod: input.paymentMethod ?? null,
      bankCard: input.bankCard ?? null,
      accrualPerReal: input.accrualPerReal ?? null,
      cpmInCents: input.cpmInCents ?? null,
      cashbackPercent: input.cashbackPercent ?? null,
      expectedCreditInCents: cost.expectedCreditInCents,
      nubankAdvance: input.nubankAdvance ?? false,
      nubankDiscountPercent: input.nubankDiscountPercent ?? 4.5,
      productExpectedAt: input.productExpectedAt
        ? new Date(input.productExpectedAt)
        : null,
      creditExpectedAt: input.creditExpectedAt
        ? new Date(input.creditExpectedAt)
        : null,
      note: input.note ?? null,
      units: {
        create: cost.unitCostsInCents.map((finalCostInCents) => ({
          userId,
          productId: input.productId,
          finalCostInCents,
          status: 'AWAITING' as const,
        })),
      },
    })

    return { purchase: serializePurchase(purchase) }
  }

  async list(userId: string, filters?: PurchaseFilters) {
    const purchases = await this.purchasesRepository.findManyByUserId(
      userId,
      filters,
    )
    const serialized = purchases.map(serializePurchase)
    const investedInCents = serialized
      .filter((p) => !p.canceled)
      .reduce((sum, p) => sum + p.paidWithFreightInCents, 0)
    return { purchases: serialized, investedInCents }
  }

  async update(userId: string, purchaseId: string, input: Partial<PurchaseInput>) {
    const current = await this.ensureOwned(userId, purchaseId)

    const data: Prisma.PurchaseUpdateInput = {}
    if (input.date !== undefined) data.date = new Date(input.date)
    for (const key of [
      'orderNumber',
      'account',
      'marketplace',
      'format',
      'formatLabel',
      'paymentMethod',
      'bankCard',
      'accrualPerReal',
      'cpmInCents',
      'cashbackPercent',
      'nubankAdvance',
      'nubankDiscountPercent',
      'unitValueInCents',
      'freightInCents',
      'note',
    ] as const) {
      if (input[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(data as any)[key] = input[key]
      }
    }
    if (input.productExpectedAt !== undefined) {
      data.productExpectedAt = input.productExpectedAt
        ? new Date(input.productExpectedAt)
        : null
    }
    if (input.creditExpectedAt !== undefined) {
      data.creditExpectedAt = input.creditExpectedAt
        ? new Date(input.creditExpectedAt)
        : null
    }

    // Recalcula o esperado com os novos parâmetros (quantidade não muda —
    // as unidades já existem; para mudar quantidade, cancele e recrie).
    const merged = { ...current, ...data } as PurchaseWithDetails
    const cost = costOf(merged)
    data.expectedCreditInCents = cost.expectedCreditInCents

    const purchase = await this.purchasesRepository.update(purchaseId, data)
    await this.recalcUnsoldUnitCosts(purchase)

    const fresh = await this.purchasesRepository.findById(purchaseId)
    return { purchase: serializePurchase(fresh ?? purchase) }
  }

  /** Marca o produto como recebido; unidades viram AVAILABLE (com dados da peça). */
  async receiveProduct(
    userId: string,
    purchaseId: string,
    receivedAt: string,
    unitData?: {
      unitId: string
      serialNumber?: string | null
      imei1?: string | null
      imei2?: string | null
      danfe?: string | null
    }[],
  ) {
    await this.ensureOwned(userId, purchaseId)

    const units = await this.stockUnitsRepository.findManyByPurchaseId(purchaseId)
    for (const unit of units) {
      const patch = unitData?.find((u) => u.unitId === unit.id)
      await this.stockUnitsRepository.update(unit.id, {
        ...(unit.status === 'AWAITING' ? { status: 'AVAILABLE' } : {}),
        ...(patch
          ? {
              serialNumber: patch.serialNumber ?? unit.serialNumber,
              imei1: patch.imei1 ?? unit.imei1,
              imei2: patch.imei2 ?? unit.imei2,
              danfe: patch.danfe ?? unit.danfe,
            }
          : {}),
      })
    }

    const purchase = await this.purchasesRepository.update(purchaseId, {
      productReceivedAt: new Date(receivedAt),
    })
    return { purchase: serializePurchase(purchase) }
  }

  /** Confirma o crédito de milhas/cashback (valor real substitui o esperado).
   *  MILHAS: recalcula o custo das unidades não vendidas.
   *  CASHBACK: o custo NÃO muda — o valor entra na CARTEIRA. */
  async confirmCredit(
    userId: string,
    purchaseId: string,
    creditedAt: string,
    actualCreditInCents?: number,
  ) {
    const current = await this.ensureOwned(userId, purchaseId)
    // snapshot ANTES do update (repos in-memory podem aliasar o objeto)
    const alreadyCredited = Boolean(current.creditReceivedAt)

    const purchase = await this.purchasesRepository.update(purchaseId, {
      creditReceivedAt: new Date(creditedAt),
      ...(actualCreditInCents !== undefined
        ? { actualCreditInCents }
        : {}),
    })

    if (purchase.format === 'CASHBACK') {
      // idempotência: só lança na carteira se ainda não havia crédito confirmado
      if (!alreadyCredited && this.walletEntries) {
        const amount =
          actualCreditInCents ?? purchase.expectedCreditInCents
        if (amount > 0) {
          await this.walletEntries.create({
            userId,
            purchaseId,
            amountInCents: amount,
            kind: 'Cashback',
            note: purchase.product?.name ?? null,
          })
        }
      }
    } else {
      await this.recalcUnsoldUnitCosts(purchase)
    }

    const fresh = await this.purchasesRepository.findById(purchaseId)
    return { purchase: serializePurchase(fresh ?? purchase) }
  }

  /** Cancela a compra; bloqueado se alguma unidade já foi vendida. */
  async cancel(userId: string, purchaseId: string) {
    const purchase = await this.ensureOwned(userId, purchaseId)
    const sold = purchase.units.filter((u) => u.saleItem !== null)
    if (sold.length > 0) {
      throw new BusinessRuleError(
        'Esta compra tem unidade já vendida — exclua a venda antes de cancelar.',
      )
    }
    await this.purchasesRepository.cancel(purchaseId)
  }

  /** Redistribui o custo efetivo nas unidades NÃO vendidas (vendidas mantêm snapshot). */
  private async recalcUnsoldUnitCosts(purchase: PurchaseWithDetails) {
    const cost = costOf(purchase)
    const units = await this.stockUnitsRepository.findManyByPurchaseId(purchase.id)
    const unsold = units.filter((u) => u.status !== 'SOLD')
    if (unsold.length === 0) return

    // Parcela justa: custo total ÷ quantidade original; sobra na 1ª não vendida.
    const perUnit = Math.floor(
      cost.effectiveFinalCostInCents / purchase.quantity,
    )
    const soldCount = units.length - unsold.length
    const remainder =
      cost.effectiveFinalCostInCents - perUnit * purchase.quantity

    for (const [index, unit] of unsold.entries()) {
      const value = index === 0 ? perUnit + remainder : perUnit
      // unidades vendidas "carregam" perUnit implícito no snapshot antigo
      void soldCount
      await this.stockUnitsRepository.update(unit.id, {
        finalCostInCents: value,
      })
    }
  }

  private async ensureOwned(userId: string, purchaseId: string) {
    const purchase = await this.purchasesRepository.findById(purchaseId)
    if (!purchase || purchase.userId !== userId) {
      throw new ResourceNotFoundError('Compra')
    }
    return purchase
  }
}
