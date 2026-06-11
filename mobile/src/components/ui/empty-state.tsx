import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Heading, Muted } from './text'

// Estado vazio padrão: ícone suave em círculo + frase que ensina + ação opcional.
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <View className="items-center px-6 py-10">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <Ionicons name={icon} size={24} className="text-muted-foreground" color="#64748b" />
      </View>
      <Heading className="text-center">{title}</Heading>
      {description ? (
        <Muted className="mt-1 max-w-[42ch] text-center">{description}</Muted>
      ) : null}
      {action ? <View className="mt-4 w-full max-w-xs">{action}</View> : null}
    </View>
  )
}
