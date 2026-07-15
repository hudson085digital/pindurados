import { Stack } from 'expo-router'
import { useColors } from '@/src/lib/theme'

export default function DevedoresLayout() {
  const c = useColors()
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.card },
        headerTitleStyle: { color: c.foreground, fontWeight: '600' },
        headerTintColor: c.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Devedor', headerBackTitle: 'Voltar' }} />
    </Stack>
  )
}
