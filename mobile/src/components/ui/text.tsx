import { Text as RNText, type TextProps } from 'react-native'
import { cn } from '@/src/lib/cn'

// Texto padrão com a cor de tinta do tema. `tnum` para valores em coluna.
export function Text({
  className,
  tnum,
  ...props
}: TextProps & { className?: string; tnum?: boolean }) {
  return (
    <RNText
      className={cn('text-foreground text-[15px]', tnum && 'tabular-nums', className)}
      {...props}
    />
  )
}

export function Muted({ className, ...props }: TextProps & { className?: string }) {
  return <RNText className={cn('text-muted-foreground text-[13px]', className)} {...props} />
}

export function Heading({ className, ...props }: TextProps & { className?: string }) {
  return <RNText className={cn('text-foreground text-lg font-semibold', className)} {...props} />
}
