import { Pressable, Text, type PressableProps } from 'react-native'
import { cn } from '@/src/lib/cn'

type Variant = 'default' | 'outline' | 'ghost' | 'destructive'

const base = 'h-11 flex-row items-center justify-center gap-2 rounded-md px-4'
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
  ...props
}: PressableProps & { title: string; variant?: Variant; className?: string }) {
  return (
    <Pressable
      className={cn(base, variants[variant], disabled && 'opacity-50', className)}
      disabled={disabled}
      accessibilityRole="button"
      {...props}
    >
      <Text className={cn('text-sm font-medium', labelColor[variant])}>{title}</Text>
    </Pressable>
  )
}
