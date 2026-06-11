import { TextInput, type TextInputProps } from 'react-native'
import { cn } from '@/src/lib/cn'

export function Input({ className, ...props }: TextInputProps & { className?: string }) {
  return (
    <TextInput
      className={cn(
        'h-11 rounded-md border border-input bg-card px-3 text-[15px] text-foreground',
        className,
      )}
      placeholderTextColor="#9aa5ad"
      {...props}
    />
  )
}
