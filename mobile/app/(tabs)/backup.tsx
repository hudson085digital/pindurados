import { View } from 'react-native'
import { EmptyState } from '@/src/components/ui/empty-state'

export default function BackupScreen() {
  return (
    <View className="flex-1 bg-background">
      <EmptyState
        icon="cloud-upload-outline"
        title="Backup dos seus dados"
        description="Em breve: exporte um arquivo de backup (dados + comprovantes) para guardar onde quiser e restaure quando trocar de aparelho. Sem login do Google."
      />
    </View>
  )
}
