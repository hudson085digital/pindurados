import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { cn } from '@/src/lib/cn'
import { useColors } from '@/src/lib/theme'

type Variant = 'default' | 'outline' | 'ghost' | 'destructive'

const base =
  'h-11 flex-row items-center justify-center gap-2 rounded-md px-4 active:scale-[0.98]'
const variants: Record<Variant, string> = {
  default: 'bg-primary active:opacity-90',
  outline: 'border border-input bg-card active:bg-secondary',
  ghost: 'active:bg-secondary',
  destructive: 'bg-destructive active:opacity-90',
}
const labelColor: Record<Variant, string> = {
  default: 'text-primary-foreground',
  outline: 'text-foreground',
  ghost: 'text-foreground',
  destructive: 'text-destructive-foreground',
}

export function Button({
  title,
  variant = 'default',
  className,
  disabled,
  loading,
  icon,
  ...props
}: PressableProps & {
  title: string
  variant?: Variant
  className?: string
  loading?: boolean
  icon?: keyof typeof Ionicons.glyphMap
}) {
  const c = useColors()
  const tint =
    variant === 'default'
      ? c.primaryForeground
      : variant === 'destructive'
        ? c.primaryForeground
        : c.foreground
  const isDisabled = disabled || loading
  return (
    <Pressable
      className={cn(base, variants[variant], isDisabled && 'opacity-50', className)}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : icon ? (
        <Ionicons name={icon} size={18} color={tint} />
      ) : null}
      <Text className={cn('text-sm font-medium', labelColor[variant])}>{title}</Text>
    </Pressable>
  )
}
