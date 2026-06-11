import { Text, View } from 'react-native'
import { cn } from '@/src/lib/cn'

type Tone = 'gray' | 'red' | 'green'

const box: Record<Tone, string> = {
  gray: 'bg-secondary',
  red: 'bg-destructive/10',
  green: 'bg-primary/10',
}
const label: Record<Tone, string> = {
  gray: 'text-muted-foreground',
  red: 'text-destructive',
  green: 'text-primary',
}

export function Tag({ children, tone = 'gray' }: { children: string; tone?: Tone }) {
  return (
    <View className={cn('self-start rounded-full px-2 py-0.5', box[tone])}>
      <Text className={cn('text-[11px] font-semibold', label[tone])}>{children}</Text>
    </View>
  )
}
