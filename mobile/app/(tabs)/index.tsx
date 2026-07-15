import { ScrollView, View, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { getDashboard } from '@/src/data/repositories/dashboard'
import { formatCurrency, isoToBR } from '@/src/lib/format'
import { useColors } from '@/src/lib/theme'
import { Card } from '@/src/components/ui/card'
import { Text, Muted } from '@/src/components/ui/text'
import { Skeleton } from '@/src/components/ui/skeleton'

const METHOD_LABEL: Record<string, string> = {
  PIX: 'Pix',
  CARD: 'Cartão',
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
  CASH: 'Dinheiro',
  NONE: 'Sem forma',
}

export default function ResumoScreen() {
  const router = useRouter()
  const c = useColors()
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })

  if (isLoading || !data) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-3 p-4">
        <View className="flex-row flex-wrap gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="min-w-[45%] flex-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-2 h-7 w-24" />
            </Card>
          ))}
        </View>
        <Card>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-5 w-full" />
          <Skeleton className="mt-2 h-5 w-3/4" />
        </Card>
      </ScrollView>
    )
  }

  const t = data.totals
  const cards = [
    { label: 'A receber', value: formatCurrency(t.toReceiveInCents), highlight: true },
    { label: 'Já recebido', value: formatCurrency(t.receivedInCents) },
    { label: 'Lucro previsto', value: formatCurrency(t.profitInCents) },
    {
      label: 'Parcelas vencidas',
      value: String(t.overdueInstallments),
      alert: t.overdueInstallments > 0,
    },
  ]

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 p-4">
      {t.receiptsPendingProof > 0 ? (
        <Card className="flex-row items-center gap-2 border-destructive/40 bg-destructive/5">
          <Ionicons name="alert-circle" size={18} color={c.destructive} />
          <Text className="flex-1 text-[13px] font-medium text-destructive">
            {t.receiptsPendingProof} recebimento(s) sem comprovante.
          </Text>
        </Card>
      ) : null}

      <View className="flex-row flex-wrap gap-3">
        {cards.map((card) => (
          <Card
            key={card.label}
            className={`min-w-[45%] flex-1 ${card.highlight ? 'border-transparent bg-primary' : ''}`}
          >
            <Text
              className={
                card.highlight
                  ? 'text-primary-foreground/80 text-[13px]'
                  : 'text-muted-foreground text-[13px]'
              }
            >
              {card.label}
            </Text>
            <Text
              tnum
              className={`mt-1 text-2xl font-bold ${card.highlight ? 'text-primary-foreground' : card.alert ? 'text-destructive' : ''}`}
            >
              {card.value}
            </Text>
          </Card>
        ))}
      </View>

      <Section title="Top devedores">
        {data.topDebtors.length === 0 ? (
          <Muted>Ninguém devendo no momento.</Muted>
        ) : (
          data.topDebtors.map((d, i) => (
            <Pressable
              key={d.customerId}
              onPress={() => router.push(`/devedores/${d.customerId}`)}
              className={`flex-row items-center gap-2 py-2.5 active:opacity-60 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <Text className="flex-1" numberOfLines={1}>
                {d.name}
              </Text>
              <Text tnum className="font-semibold text-destructive">
                {formatCurrency(d.balanceInCents)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={c.mutedForeground} />
            </Pressable>
          ))
        )}
      </Section>

      <Section title="Próximos vencimentos">
        {data.upcoming.length === 0 ? (
          <Muted>Nada a vencer.</Muted>
        ) : (
          data.upcoming.map((u, i) => (
            <View
              key={i}
              className={`flex-row items-center justify-between py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <View className="flex-1 pr-2">
                <Text numberOfLines={1}>{u.customerName}</Text>
                <Muted>
                  Parcela {u.number} · vence {isoToBR(u.dueDate.slice(0, 10))}
                </Muted>
              </View>
              <Text tnum className={`font-semibold ${u.overdue ? 'text-destructive' : ''}`}>
                {formatCurrency(u.balanceInCents)}
              </Text>
            </View>
          ))
        )}
      </Section>

      <Section title="Recebido por mês">
        {data.receivedByMonth.length === 0 ? (
          <Muted>Nenhum recebimento ainda.</Muted>
        ) : (
          data.receivedByMonth.map((m) => (
            <View key={m.month} className="flex-row items-center justify-between py-1.5">
              <Muted>{m.month}</Muted>
              <Text tnum className="font-semibold">
                {formatCurrency(m.amountInCents)}
              </Text>
            </View>
          ))
        )}
      </Section>

      <Section title="Por forma de pagamento">
        {data.byMethod.length === 0 ? (
          <Muted>Sem dados ainda.</Muted>
        ) : (
          data.byMethod.map((m) => (
            <View key={m.method} className="flex-row items-center justify-between py-1.5">
              <Muted>{METHOD_LABEL[m.method] ?? m.method}</Muted>
              <Text tnum className="font-semibold">
                {formatCurrency(m.amountInCents)}
              </Text>
            </View>
          ))
        )}
      </Section>

      <Section title="Resumo">
        <SummaryRow label="Vendas registradas" value={String(t.salesCount)} />
        <SummaryRow label="Vendas quitadas" value={String(t.settledSalesCount)} />
        <SummaryRow label="Devedores em aberto" value={String(t.customersWithDebt)} />
        <SummaryRow label="Parcelas com juros de atraso" value={String(t.lateInstallments)} />
        <SummaryRow label="Total vendido" value={formatCurrency(t.soldInCents)} />
        <SummaryRow label="Custo total" value={formatCurrency(t.costInCents)} />
      </Section>
    </ScrollView>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Muted>{label}</Muted>
      <Text tnum className="font-semibold">
        {value}
      </Text>
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <Text className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </Text>
      {children}
    </Card>
  )
}
