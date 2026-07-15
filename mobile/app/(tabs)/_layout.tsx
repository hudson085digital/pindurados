import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { type ColorValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColors } from '@/src/lib/theme'
import { Logo } from '@/src/components/ui/logo'

function icon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color as string} size={size} />
  )
}

export default function TabLayout() {
  const c = useColors()
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        // Header alinhado ao tema (sem mais branco fixo no modo escuro).
        headerStyle: { backgroundColor: c.card },
        headerTitleStyle: { color: c.foreground, fontWeight: '600' },
        headerTintColor: c.foreground,
        headerShadowVisible: false,
        // Tab bar segue o tema; ativo = accent, inativo = texto suave legível.
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
          // Altura confortável (alvos ≥44px) respeitando o inset inferior real.
          height: 56 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Resumo',
          headerTitle: () => <Logo />,
          tabBarIcon: icon('home-outline'),
        }}
      />
      <Tabs.Screen
        name="devedores"
        options={{ title: 'Devedores', tabBarIcon: icon('people-outline') }}
      />
      <Tabs.Screen
        name="nova-venda"
        options={{ title: 'Nova venda', tabBarIcon: icon('add-circle-outline') }}
      />
      <Tabs.Screen name="pix" options={{ title: 'Pix', tabBarIcon: icon('key-outline') }} />
      <Tabs.Screen
        name="backup"
        options={{ title: 'Backup', tabBarIcon: icon('cloud-upload-outline') }}
      />
    </Tabs>
  )
}
