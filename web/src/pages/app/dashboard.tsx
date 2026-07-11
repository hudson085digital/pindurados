import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { getDashboard } from '@/api/reports'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`
}

import { RECEIPT_METHOD_LABELS } from '@pindurados/core'

const METHOD_LABEL: Record<string, string> = {
  ...RECEIPT_METHOD_LABELS,
  NONE: 'Sem forma',
}

export function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })

  if (isLoading || !data) {
    return <DashboardSkeleton />
  }

  const t = data.totals
  const cards = [
    { label: 'A receber', value: formatCurrency(t.toReceiveInCents), highlight: true },
    { label: 'Já recebido', value: formatCurrency(t.receivedInCents) },
    { label: 'Lucro previsto', value: formatCurrency(t.profitInCents) },
    { label: 'Parcelas vencidas', value: String(t.overdueInstallments), alert: t.overdueInstallments > 0 },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Resumo" />

      {t.receiptsPendingProof > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-2.5 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {t.receiptsPendingProof} recebimento(s) sem comprovante. Anexe para manter tudo em dia.
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((s) => (
          <Card key={s.label} className={s.highlight ? 'border-transparent bg-brand-gradient text-white shadow-md' : ''}>
            <CardContent className="p-4">
              <p className={s.highlight ? 'text-sm text-white/85' : 'text-sm text-muted-foreground'}>
                {s.label}
              </p>
              <p className={cn('mt-1 font-display text-2xl font-bold tabular-nums', s.alert && 'text-destructive')}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.loja && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Investido no mês</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                  {formatCurrency(data.loja.investedInCents)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Aguardando chegada</p>
                <p className={cn('mt-1 font-display text-2xl font-bold tabular-nums', data.loja.pending.pendingProductsCount > 0 && 'text-destructive')}>
                  {data.loja.pending.pendingProductsCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.loja.pending.pendingProductsValueInCents)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Créditos pendentes</p>
                <p className={cn('mt-1 font-display text-2xl font-bold tabular-nums', data.loja.pending.pendingCreditsCount > 0 && 'text-destructive')}>
                  {formatCurrency(data.loja.pending.pendingCreditsValueInCents)}
                </p>
                <p className="text-xs text-muted-foreground">milhas / cashback</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">A receber (casada)</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                  {formatCurrency(data.loja.pending.pendingPaymentsValueInCents)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.loja.pending.overduePaymentsValueInCents)} vencido
                </p>
              </CardContent>
            </Card>
          </div>

          {(data.loja.pending.pendingProductsCount > 0 ||
            data.loja.pending.pendingCreditsCount > 0) && (
            <Button asChild variant="secondary" className="w-full">
              <Link to="/loja/compras?aba=pendencias">
                Ver pendências da loja <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}

          {data.loja.monthlyProfit.length > 0 && (
            <Section title="Lucro e margem por mês">
              <div className="divide-y divide-border">
                {data.loja.monthlyProfit.map((m) => (
                  <div key={m.month} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                    <span className="text-muted-foreground">{monthLabel(m.month)}</span>
                    <span className="text-right">
                      <span className="font-semibold tabular-nums text-success">
                        {formatCurrency(m.profitInCents)}
                      </span>
                      {m.marginPercent != null && (
                        <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                          {m.marginPercent.toLocaleString('pt-BR')}% margem
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      <Section title="Recebido por mês">
        {data.receivedByMonth.length === 0 ? (
          <Empty>Nenhum recebimento ainda.</Empty>
        ) : (
          <Bars
            items={data.receivedByMonth.map((m) => ({
              label: monthLabel(m.month),
              value: m.amountInCents,
            }))}
          />
        )}
      </Section>

      <Section title="Por forma de pagamento">
        {data.byMethod.length === 0 ? (
          <Empty>Sem dados ainda.</Empty>
        ) : (
          <Bars
            items={data.byMethod.map((m) => ({
              label: METHOD_LABEL[m.method] ?? m.method,
              value: m.amountInCents,
            }))}
          />
        )}
      </Section>

      <Section title="Top clientes">
        {data.topDebtors.length === 0 ? (
          <Empty>Ninguém devendo no momento.</Empty>
        ) : (
          <Bars
            items={data.topDebtors.map((d) => ({
              label: d.name,
              value: d.balanceInCents,
              href: `/clientes/${d.customerId}`,
            }))}
            tone="destructive"
          />
        )}
      </Section>

      <Section title="Próximos vencimentos">
        {data.upcoming.length === 0 ? (
          <Empty>Nada a vencer.</Empty>
        ) : (
          <div className="divide-y divide-border">
            {data.upcoming.map((u, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm first:pt-0">
                <div>
                  <p className="font-medium">{u.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    Parcela {u.number} · vence {formatDate(u.dueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatCurrency(u.balanceInCents)}</p>
                  {u.overdue && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                      vencida
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Números gerais">
        <div className="divide-y divide-border">
          <Row label="Vendas registradas" value={t.salesCount} />
          <Row label="Vendas quitadas" value={t.settledSalesCount} />
          <Row label="Clientes em aberto" value={t.customersWithDebt} />
          <Row label="Parcelas em atraso (juros)" value={t.lateInstallments} />
          <Row label="Total vendido" value={formatCurrency(t.soldInCents)} />
          <Row label="Custo total" value={formatCurrency(t.costInCents)} />
        </div>
      </Section>

      <Button asChild className="w-full">
        <Link to="/nova-venda">
          Registrar nova venda <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <PageHeader title="Resumo" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-4/5" />
            <Skeleton className="h-2.5 w-3/5" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
        {children}
      </CardContent>
    </Card>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-1 text-sm text-muted-foreground">{children}</p>
}

function Bars({
  items,
  tone = 'primary',
}: {
  items: { label: string; value: number; href?: string }[]
  tone?: 'primary' | 'destructive'
}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)))
  const barColor = tone === 'destructive' ? 'bg-destructive/70' : 'bg-brand-gradient'

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const pct = Math.round((Math.abs(item.value) / max) * 100)
        const content = (
          <>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="truncate pr-2">{item.label}</span>
              <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(item.value)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out', barColor)} style={{ width: `${pct}%` }} />
            </div>
          </>
        )
        return item.href ? (
          <Link
            key={i}
            to={item.href}
            className="block rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            {content}
          </Link>
        ) : (
          <div key={i}>{content}</div>
        )
      })}
    </div>
  )
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between py-2 first:pt-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}
