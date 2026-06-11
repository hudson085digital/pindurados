import { View } from 'react-native'
import { EmptyState } from '@/src/components/ui/empty-state'

export default function NovaVendaScreen() {
  return (
    <View className="flex-1 bg-background">
      <EmptyState
        icon="add-circle-outline"
        title="Nova venda"
        description="Em breve: registre uma venda fiado com cálculo de juros e parcelas no próprio aparelho."
      />
    </View>
  )
}
