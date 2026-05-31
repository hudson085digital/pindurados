import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getSummary } from '@/api/reports'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function Dashboard() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary'],
    queryFn: getSummary,
  })

  if (isLoading || !summary) {
    return <p className="py-10 text-center text-muted-foreground">Carregando…</p>
  }

  const stats = [
    { label: 'A receber', value: formatCurrency(summary.totalToReceiveInCents), highlight: true },
    { label: 'Já recebido', value: formatCurrency(summary.totalReceivedInCents) },
    { label: 'Total vendido', value: formatCurrency(summary.totalSoldInCents) },
    {
      label: 'Parcelas vencidas',
      value: String(summary.overdueInstallments),
      alert: summary.overdueInstallments > 0,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Card
            key={s.label}
            className={s.highlight ? 'bg-primary text-primary-foreground' : ''}
          >
            <CardContent className="p-4">
              <p
                className={
                  s.highlight
                    ? 'text-sm text-primary-foreground/80'
                    : 'text-sm text-muted-foreground'
                }
              >
                {s.label}
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  s.alert ? 'text-destructive' : ''
                }`}
              >
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="divide-y p-4">
          <Row label="Vendas registradas" value={summary.salesCount} />
          <Row label="Vendas quitadas" value={summary.settledSalesCount} />
          <Row label="Parcelas em atraso" value={summary.lateInstallments} />
        </CardContent>
      </Card>

      <Button asChild className="w-full">
        <Link to="/nova-venda">+ Registrar nova venda</Link>
      </Button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-2 first:pt-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
