import { useState } from 'react'
import { TextInput, type TextInputProps } from 'react-native'
import { cn } from '@/src/lib/cn'
import { useColors } from '@/src/lib/theme'

export function Input({
  className,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { className?: string }) {
  const c = useColors()
  const [focused, setFocused] = useState(false)
  return (
    <TextInput
      className={cn(
        // text-base (16px) evita o zoom automático do iOS ao focar o campo.
        'h-12 rounded-md border bg-card px-3 text-base text-foreground',
        focused ? 'border-primary' : 'border-input',
        className,
      )}
      // mutedForeground passa o contraste AA (≥4.5:1); o cinza fixo anterior não.
      placeholderTextColor={c.mutedForeground}
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        onBlur?.(e)
      }}
      {...props}
    />
  )
}
