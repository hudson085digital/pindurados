import { Pressable, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { cn } from '@/src/lib/cn'
import { useColors } from '@/src/lib/theme'

type Tone = 'default' | 'primary' | 'destructive'

const labelColor: Record<Tone, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  destructive: 'text-destructive',
}

// Ação textual inline com área de toque confortável (py-2 + hitSlop ≈ ≥44px),
// substituindo os links de 17px que eram difíceis de acertar no balcão.
export function TextAction({
  label,
  onPress,
  tone = 'default',
  icon,
}: {
  label: string
  onPress: () => void
  tone?: Tone
  icon?: keyof typeof Ionicons.glyphMap
}) {
  const c = useColors()
  const tint = tone === 'primary' ? c.primary : tone === 'destructive' ? c.destructive : c.foreground
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      accessibilityRole="button"
      className="flex-row items-center gap-1 py-2 active:opacity-60"
    >
      {icon ? <Ionicons name={icon} size={15} color={tint} /> : null}
      <Text className={cn('text-[13px] font-medium', labelColor[tone])}>{label}</Text>
    </Pressable>
  )
}
