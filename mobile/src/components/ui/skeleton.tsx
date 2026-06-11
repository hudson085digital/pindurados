import { View, type ViewProps } from 'react-native'
import { cn } from '@/src/lib/cn'

// Bloco de carregamento (placeholder). Para animação de pulso pode-se trocar por
// Reanimated; aqui mantemos simples e estável.
export function Skeleton({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn('rounded-md bg-muted', className)} {...props} />
}
