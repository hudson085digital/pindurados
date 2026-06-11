import { Stack } from 'expo-router'

export default function DevedoresLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Devedor' }} />
    </Stack>
  )
}
