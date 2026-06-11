import { Link, Stack } from 'expo-router'
import { View } from 'react-native'
import { Heading, Muted } from '@/src/components/ui/text'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Não encontrado' }} />
      <View className="flex-1 items-center justify-center gap-2 bg-background p-6">
        <Heading>Esta tela não existe.</Heading>
        <Link href="/">
          <Muted className="text-primary">Voltar ao início</Muted>
        </Link>
      </View>
    </>
  )
}
