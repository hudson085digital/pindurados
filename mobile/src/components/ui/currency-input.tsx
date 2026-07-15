import { useState } from 'react'
import { TextInput, View, Text } from 'react-native'
import { centsToDisplay, digitsToCents } from '@pindurados/core'
import { cn } from '@/src/lib/cn'
import { useColors } from '@/src/lib/theme'

// Input de moeda: prefixo "R$", mostra "1.234,50" e devolve centavos.
export function CurrencyInput({
  valueInCents,
  onChangeCents,
  placeholder = '0,00',
  className,
}: {
  valueInCents: number
  onChangeCents: (cents: number) => void
  placeholder?: string
  className?: string
}) {
  const c = useColors()
  const [focused, setFocused] = useState(false)
  return (
    <View
      className={cn(
        'h-12 flex-row items-center rounded-md border bg-card px-3',
        focused ? 'border-primary' : 'border-input',
        className,
      )}
    >
      <Text className="mr-1 text-base text-muted-foreground">R$</Text>
      <TextInput
        className="flex-1 text-base tabular-nums text-foreground"
        keyboardType="number-pad"
        placeholder={placeholder}
        placeholderTextColor={c.mutedForeground}
        value={valueInCents ? centsToDisplay(valueInCents) : ''}
        onChangeText={(t) => onChangeCents(digitsToCents(t))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  )
}
