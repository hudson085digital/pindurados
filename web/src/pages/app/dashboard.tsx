import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getDashboard } from '@/api/reports'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`
}

const METHOD_LABEL: Record<string, string> = {
  PIX: 'Pix',
  CARD: 'Cartão',
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
  CASH: 'Dinheiro',
  NONE: 'Sem forma',
}

export function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })

  if (isLoading || !data) {
    return <p className="py-10 text-center text-muted-foreground">Carregando…</p>
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
      {t.receiptsPendingProof > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">
            ⚠ {t.receiptsPendingProof} recebimento(s) sem comprovante. Anexe para manter tudo em dia.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {cards.map((s) => (
          <Card key={s.label} className={s.highlight ? 'bg-primary text-primary-foreground' : ''}>
            <CardContent className="p-4">
              <p className={s.highlight ? 'text-sm text-primary-foreground/80' : 'text-sm text-muted-foreground'}>
                {s.label}
              </p>
              <p className={cn('mt-1 text-2xl font-bold', s.alert && 'text-destructive')}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
          <Empty>Sem dados.</Empty>
        ) : (
          <Bars
            items={data.byMethod.map((m) => ({
              label: METHOD_LABEL[m.method] ?? m.method,
              value: m.amountInCents,
            }))}
          />
        )}
      </Section>

      <Section title="Top devedores">
        {data.topDebtors.length === 0 ? (
          <Empty>Ninguém devendo. 🎉</Empty>
        ) : (
          <Bars
            items={data.topDebtors.map((d) => ({
              label: d.name,
              value: d.balanceInCents,
              href: `/devedores/${d.customerId}`,
            }))}
            tone="destructive"
          />
        )}
      </Section>

      <Section title="Próximos vencimentos">
        {data.upcoming.length === 0 ? (
          <Empty>Nada a vencer.</Empty>
        ) : (
          <div className="divide-y">
            {data.upcoming.map((u, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm first:pt-0">
                <div>
                  <p className="font-medium">{u.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    Parcela {u.number} · vence {formatDate(u.dueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(u.balanceInCents)}</p>
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

      <Card>
        <CardContent className="divide-y p-4">
          <Row label="Vendas registradas" value={t.salesCount} />
          <Row label="Vendas quitadas" value={t.settledSalesCount} />
          <Row label="Devedores em aberto" value={t.customersWithDebt} />
          <Row label="Parcelas em atraso (juros)" value={t.lateInstallments} />
          <Row label="Total vendido" value={formatCurrency(t.soldInCents)} />
          <Row label="Custo total" value={formatCurrency(t.costInCents)} />
        </CardContent>
      </Card>

      <Button asChild className="w-full">
        <Link to="/nova-venda">+ Registrar nova venda</Link>
      </Button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        {children}
      </CardContent>
    </Card>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>
}

function Bars({
  items,
  tone = 'primary',
}: {
  items: { label: string; value: number; href?: string }[]
  tone?: 'primary' | 'destructive'
}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)))
  const barColor = tone === 'destructive' ? 'bg-destructive/70' : 'bg-primary'

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const pct = Math.round((Math.abs(item.value) / max) * 100)
        const content = (
          <>
            <div className="mb-0.5 flex items-center justify-between text-sm">
              <span className="truncate pr-2">{item.label}</span>
              <span className="shrink-0 font-semibold">{formatCurrency(item.value)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className={cn('h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
            </div>
          </>
        )
        return item.href ? (
          <Link key={i} to={item.href} className="block">
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
      <span className="font-semibold">{value}</span>
    </div>
  )
}
