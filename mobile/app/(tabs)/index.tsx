import { ScrollView, View } from 'react-native'
import { Card } from '@/src/components/ui/card'
import { Text, Muted } from '@/src/components/ui/text'
import { formatCurrency } from '@/src/lib/format'

// Resumo (dashboard local). Placeholder da base — os valores reais entram com o
// dashboardRepo (US1). Mantém a identidade visual e prova o tema/format/UI.
const CARDS = [
  { label: 'A receber', value: 0, highlight: true },
  { label: 'Já recebido', value: 0 },
  { label: 'Lucro previsto', value: 0 },
  { label: 'Parcelas vencidas', value: 0, count: true },
]

export default function ResumoScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-3 p-4">
      <View className="flex-row flex-wrap gap-3">
        {CARDS.map((c) => (
          <Card
            key={c.label}
            className={`min-w-[45%] flex-1 ${c.highlight ? 'border-transparent bg-primary' : ''}`}
          >
            <Text className={c.highlight ? 'text-primary-foreground/80 text-[13px]' : 'text-muted-foreground text-[13px]'}>
              {c.label}
            </Text>
            <Text
              tnum
              className={`mt-1 text-2xl font-bold ${c.highlight ? 'text-primary-foreground' : ''}`}
            >
              {c.count ? '0' : formatCurrency(c.value)}
            </Text>
          </Card>
        ))}
      </View>

      <Card>
        <Muted>
          App local — seus dados ficam só neste aparelho. Cadastre devedores e vendas para ver os
          números aqui.
        </Muted>
      </Card>
    </ScrollView>
  )
}
