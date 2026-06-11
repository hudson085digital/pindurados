import '../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { getDb } from '@/src/data/db'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

const queryClient = new QueryClient()

export default function RootLayout() {
  // Inicializa (abre + migra) o banco local no boot do app.
  useEffect(() => {
    getDb().catch(() => {})
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="+not-found"
            options={{ headerShown: true, title: 'Não encontrado' }}
          />
        </Stack>
        <StatusBar style="auto" />
        <Toast />
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}
