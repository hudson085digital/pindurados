import * as React from 'react'
import { Input, InputProps } from './input'
import { digitsToCents, centsToDisplay } from '@/lib/masks'

interface CurrencyInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  valueInCents: number
  onChangeCents: (cents: number) => void
}

// Input de moeda: mostra "1.234,50" e devolve o valor em centavos.
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ valueInCents, onChangeCents, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        inputMode="decimal"
        value={valueInCents ? centsToDisplay(valueInCents) : ''}
        onChange={(e) => onChangeCents(digitsToCents(e.target.value))}
        {...props}
      />
    )
  },
)
CurrencyInput.displayName = 'CurrencyInput'
