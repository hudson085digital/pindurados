import { SalesRepository } from '@/repositories/sales-repository'
import { PurchasesRepository } from '@/repositories/purchases-repository'
import { serializeSale } from '@/utils/serialize-sale'
import { buildDashboard, DashboardData } from '@/utils/build-dashboard'
import { serializePurchase } from './manage-purchases'
import { GetPendingPanelUseCase, PendingPanel } from './pending-panel'

interface GetDashboardUseCaseRequest {
  userId: string
}

// 025 — extensão aditiva do dashboard com os números da loja.
export interface LojaDashboard {
  /** Investido em compras no mês corrente (pago com frete, sem canceladas). */
  investedInCents: number
  /** Lucro e margem por mês (vendas com custo, base custo efetivo). */
  monthlyProfit: { month: string; profitInCents: number; marginPercent: number | null }[]
  /** Estatísticas de recebimento/créditos + pendências (painel da loja). */
  pending: PendingPanel['stats']
}

export type DashboardWithLoja = DashboardData & { loja?: LojaDashboard }

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export class GetDashboardUseCase {
  constructor(
    private salesRepository: SalesRepository,
    // Opcional para compatibilidade: sem repo de compras, o bloco `loja` não vem.
    private purchasesRepository?: PurchasesRepository,
  ) {}

  async execute({
    userId,
  }: GetDashboardUseCaseRequest): Promise<DashboardWithLoja> {
    const sales = (await this.salesRepository.findManyByUserId(userId)).map(
      serializeSale,
    )
    const base = buildDashboard(sales)

    if (!this.purchasesRepository) return base

    // Investimento do mês corrente
    const now = new Date()
    const currentMonth = monthKey(now)
    const purchases = (
      await this.purchasesRepository.findManyByUserId(userId)
    ).filter((p) => !p.canceled)
    const investedInCents = purchases
      .filter((p) => monthKey(p.date) === currentMonth)
      .reduce((sum, p) => sum + serializePurchase(p).paidWithFreightInCents, 0)

    // Lucro/margem por mês (vendas que têm custo informado/derivado)
    const byMonth = new Map<string, { profit: number; revenue: number }>()
    for (const sale of sales) {
      if (sale.productCostInCents <= 0) continue
      const key = monthKey(sale.saleDate)
      const acc = byMonth.get(key) ?? { profit: 0, revenue: 0 }
      acc.profit += sale.profitInCents
      acc.revenue += sale.downPaymentInCents + sale.totalInCents
      byMonth.set(key, acc)
    }
    const monthlyProfit = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, { profit, revenue }]) => ({
        month,
        profitInCents: profit,
        marginPercent:
          revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : null,
      }))

    const panel = await new GetPendingPanelUseCase(
      this.purchasesRepository,
    ).execute(userId)

    return {
      ...base,
      loja: { investedInCents, monthlyProfit, pending: panel.stats },
    }
  }
}
