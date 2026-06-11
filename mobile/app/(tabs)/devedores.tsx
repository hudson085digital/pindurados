import { View } from 'react-native'
import { EmptyState } from '@/src/components/ui/empty-state'

export default function DevedoresScreen() {
  return (
    <View className="flex-1 bg-background">
      <EmptyState
        icon="people-outline"
        title="Nenhum devedor ainda"
        description="Cadastre quem compra fiado para começar a registrar vendas e acompanhar o que cada um deve."
      />
    </View>
  )
}
