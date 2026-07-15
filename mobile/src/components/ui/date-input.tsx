import { maskDateBR } from '@/src/lib/format'
import { Input } from './input'

// Campo de data como texto mascarado (dd/mm/aaaa). Mantém o padrão do app
// (tudo é Input) e funciona no Expo Go sem módulo nativo de date picker.
export function DateInput({
  value,
  onChangeText,
  className,
}: {
  value: string
  onChangeText: (br: string) => void
  className?: string
}) {
  return (
    <Input
      value={value}
      onChangeText={(t) => onChangeText(maskDateBR(t))}
      keyboardType="number-pad"
      placeholder="dd/mm/aaaa"
      maxLength={10}
      className={className}
    />
  )
}
