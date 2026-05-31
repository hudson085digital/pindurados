import * as React from 'react'
import { Input, InputProps } from './input'
import { formatPhone } from '@/lib/masks'

interface PhoneInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  value: string
  onChangeValue: (value: string) => void
}

// Input de telefone com máscara (XX) XXXXX-XXXX.
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChangeValue, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        inputMode="tel"
        maxLength={16}
        value={value}
        onChange={(e) => onChangeValue(formatPhone(e.target.value))}
        {...props}
      />
    )
  },
)
PhoneInput.displayName = 'PhoneInput'
