import { PurchasesRepository } from '@/repositories/purchases-repository'
import { SalesRepository } from '@/repositories/sales-repository'
import { serializeSale } from '@/utils/serialize-sale'
import { serializePurchase } from './manage-purchases'

// Painel de pendências da loja (025): o que ainda NÃO chegou (produtos), o que
// ainda NÃO caiu (milhas/cashback) e o que ainda NÃO foi pago (vendas a prazo /
// "casada"). Tudo derivado por consulta — nenhum estado novo.

export interface PendingPanel {
  products: {
    purchaseId: string
    productName: string
    marketplace: string | null
    quantity: number
    expectedAt: Date | null
    daysLate: number
    valueInCents: number
  }[]
  credits: {
    purchaseId: string
    productName: string
    format: string
    formatLabel: string | null
    expectedAt: Date | null
    daysLate: number
    expectedCreditInCents: number
  }[]
  /** Vendas sem produto do sistema vinculado (obrigação de registrar). */
  noProduct: {
    saleId: string
    customerId: string
    customerName: string
    description: string | null
    saleDate: Date
    valueInCents: number
  }[]
  /** Vendas a prazo com saldo em aberto (a "casada" da revenda e o fiado). */
  payments: {
    saleId: string
    customerId: string
    customerName: string
    description: string | null
    balanceInCents: number
    nextDueDate: Date | null
    daysLate: number
  }[]
  stats: {
    /** Produtos recebidos (compras ativas). */
    receivedCount: number
    /** Produtos aguardando recebimento. */
    pendingProductsCount: number
    pendingProductsValueInCents: number
    /** Créditos de milhas/cashback confirmados (valor real ou esperado). */
    creditedCount: number
    creditedValueInCents: number
    /** Créditos pendentes. */
    pendingCreditsCount: number
    pendingCreditsValueInCents: number
    /** Vendas sem produto registrado no sistema. */
    noProductCount: number
    /** Pagamentos pendentes de vendas a prazo. */
    pendingPaymentsCount: number
    pendingPaymentsValueInCents: number
    /** Parcela vencida: parte do pendente que já está em atraso. */
    overduePaymentsValueInCents: number
  }
}

function daysLate(expected: Date | null, today: Date): number {
  if (!expected || expected >= today) return 0
  return Math.floor((today.getTime() - expected.getTime()) / 86_400_000)
}

export class GetPendingPanelUseCase {
  constructor(
    private purchasesRepository: PurchasesRepository,
    // Opcional: com o repo de vendas, o painel inclui pagamentos pendentes.
    private salesRepository?: SalesRepository,
  ) {}

  async execute(userId: string): Promise<PendingPanel> {
    const purchases = (
      await this.purchasesRepository.findManyByUserId(userId)
    ).filter((p) => !p.canceled)
    const today = new Date()

    const panel: PendingPanel = {
      products: [],
      credits: [],
      noProduct: [],
      payments: [],
      stats: {
        receivedCount: 0,
        pendingProductsCount: 0,
        pendingProductsValueInCents: 0,
        creditedCount: 0,
        creditedValueInCents: 0,
        pendingCreditsCount: 0,
        pendingCreditsValueInCents: 0,
        noProductCount: 0,
        pendingPaymentsCount: 0,
        pendingPaymentsValueInCents: 0,
        overduePaymentsValueInCents: 0,
      },
    }

    for (const purchase of purchases) {
      const s = serializePurchase(purchase)

      if (purchase.productReceivedAt) {
        panel.stats.receivedCount += 1
      } else {
        panel.stats.pendingProductsCount += 1
        panel.stats.pendingProductsValueInCents += s.paidWithFreightInCents
        panel.products.push({
          purchaseId: purchase.id,
          productName: purchase.product.name,
          marketplace: purchase.marketplace,
          quantity: purchase.quantity,
          expectedAt: purchase.productExpectedAt,
          daysLate: daysLate(purchase.productExpectedAt, today),
          valueInCents: s.paidWithFreightInCents,
        })
      }

      const hasCredit =
        purchase.format === 'MILES' || purchase.format === 'CASHBACK'
      if (hasCredit) {
        const creditValue =
          purchase.actualCreditInCents ?? purchase.expectedCreditInCents
        if (purchase.creditReceivedAt) {
          panel.stats.creditedCount += 1
          panel.stats.creditedValueInCents += creditValue
        } else {
          panel.stats.pendingCreditsCount += 1
          panel.stats.pendingCreditsValueInCents += purchase.expectedCreditInCents
          panel.credits.push({
            purchaseId: purchase.id,
            productName: purchase.product.name,
            format: purchase.format,
            formatLabel: purchase.formatLabel,
            expectedAt: purchase.creditExpectedAt,
            daysLate: daysLate(purchase.creditExpectedAt, today),
            expectedCreditInCents: purchase.expectedCreditInCents,
          })
        }
      }
    }

    // Pagamentos pendentes das vendas a prazo ("casada"/fiado) — deriva do
    // núcleo existente (serializeSale), nada muda no fiado.
    if (this.salesRepository) {
      const sales = (
        await this.salesRepository.findManyByUserId(userId)
      ).map(serializeSale)

      for (const sale of sales) {
        // venda sem produto do sistema: obrigação de registrar/vincular
        if (sale.items.length === 0) {
          panel.stats.noProductCount += 1
          panel.noProduct.push({
            saleId: sale.id,
            customerId: sale.customerId,
            customerName: sale.customer.name,
            description: sale.description,
            saleDate: sale.saleDate,
            valueInCents: sale.productValueInCents,
          })
        }

        if (sale.balanceInCents <= 0) continue

        const open = sale.installments.filter((i) => i.status !== 'PAID')
        const overdue = open.filter((i) => i.overdue)
        const next = open[0] ?? null
        const worst = overdue.reduce<Date | null>(
          (acc, i) => (!acc || i.dueDate < acc ? i.dueDate : acc),
          null,
        )

        panel.stats.pendingPaymentsCount += 1
        panel.stats.pendingPaymentsValueInCents += sale.balanceInCents
        panel.stats.overduePaymentsValueInCents += overdue.reduce(
          (sum, i) => sum + i.balanceInCents,
          0,
        )
        panel.payments.push({
          saleId: sale.id,
          customerId: sale.customerId,
          customerName: sale.customer.name,
          description: sale.description,
          balanceInCents: sale.balanceInCents,
          nextDueDate: next?.dueDate ?? null,
          daysLate: daysLate(worst, today),
        })
      }
    }

    // mais atrasados primeiro; sem previsão vai para o fim
    panel.products.sort((a, b) => b.daysLate - a.daysLate)
    panel.credits.sort((a, b) => b.daysLate - a.daysLate)
    panel.payments.sort((a, b) => b.daysLate - a.daysLate)

    return panel
  }
}
