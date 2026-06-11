import { View } from 'react-native'
import { EmptyState } from '@/src/components/ui/empty-state'

export default function PixScreen() {
  return (
    <View className="flex-1 bg-background">
      <EmptyState
        icon="key-outline"
        title="Nenhuma chave Pix"
        description="Em breve: cadastre suas chaves Pix para usar nas cobranças."
      />
    </View>
  )
}
