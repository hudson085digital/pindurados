import { Text, View } from 'react-native'
import { cn } from '@/src/lib/cn'

export function Label({ children, className }: { children: string; className?: string }) {
  return (
    <Text className={cn('mb-1 text-[13px] font-medium text-foreground', className)}>{children}</Text>
  )
}

export function Field({ children }: { children: React.ReactNode }) {
  return <View className="gap-1">{children}</View>
}
