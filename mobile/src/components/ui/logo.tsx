import { View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

// Marca: tijolo emerald com glifo de recibo + wordmark. Sem emoji.
export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const tile = size === 'lg' ? 'h-11 w-11 rounded-xl' : 'h-8 w-8 rounded-lg'
  const glyph = size === 'lg' ? 26 : 18
  const word = size === 'lg' ? 'text-xl' : 'text-lg'
  return (
    <View className="flex-row items-center gap-2">
      <View className={`items-center justify-center bg-primary ${tile}`}>
        <Ionicons name="receipt-outline" size={glyph} color="#ffffff" />
      </View>
      <Text className={`font-semibold text-foreground ${word}`}>Pindurados</Text>
    </View>
  )
}
