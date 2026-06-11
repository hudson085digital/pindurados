import { TextInput } from 'react-native'
import { centsToDisplay, digitsToCents } from '@pindurados/core'
import { cn } from '@/src/lib/cn'

// Input de moeda: mostra "1.234,50" e devolve centavos.
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
  return (
    <TextInput
      className={cn(
        'h-11 rounded-md border border-input bg-card px-3 text-[15px] text-foreground',
        className,
      )}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor="#9aa5ad"
      value={valueInCents ? centsToDisplay(valueInCents) : ''}
      onChangeText={(t) => onChangeCents(digitsToCents(t))}
    />
  )
}
