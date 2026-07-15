import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useColors } from '@/src/lib/theme'
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
  const c = useColors()
  return (
    <View className="items-center px-6 py-10">
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <Ionicons name={icon} size={26} color={c.mutedForeground} />
      </View>
      <Heading className="text-center">{title}</Heading>
      {description ? (
        <Muted className="mt-1 max-w-xs text-center leading-5">{description}</Muted>
      ) : null}
      {action ? <View className="mt-4 w-full max-w-xs">{action}</View> : null}
    </View>
  )
}
