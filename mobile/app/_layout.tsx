import '../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { getDb } from '@/src/data/db'
import { useColors } from '@/src/lib/theme'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

const queryClient = new QueryClient()

export default function RootLayout() {
  const c = useColors()

  // Inicializa (abre + migra) o banco local no boot do app.
  useEffect(() => {
    getDb().catch(() => {})
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="+not-found"
            options={{
              headerShown: true,
              title: 'Não encontrado',
              headerStyle: { backgroundColor: c.card },
              headerTitleStyle: { color: c.foreground },
              headerTintColor: c.foreground,
            }}
          />
        </Stack>
        <StatusBar style={c.scheme === 'dark' ? 'light' : 'dark'} />
        <Toast />
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}
