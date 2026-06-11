import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { ColorValue } from 'react-native'

// Accent emerald (hsl(162 72% 30%)) — cor da aba ativa.
const ACTIVE = '#159c80'

function icon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color as string} size={size} />
  )
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: ACTIVE, headerShown: true }}>
      <Tabs.Screen name="index" options={{ title: 'Resumo', tabBarIcon: icon('home-outline') }} />
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
