import { Share, Linking } from 'react-native'

// Compartilha a cobrança: se houver link de WhatsApp, abre direto; senão usa o
// compartilhar nativo (o usuário escolhe o app). Sem dependências externas.
export async function shareCharge(input: { message: string; whatsappUrl: string | null }) {
  if (input.whatsappUrl) {
    const can = await Linking.canOpenURL(input.whatsappUrl).catch(() => false)
    if (can) {
      await Linking.openURL(input.whatsappUrl)
      return
    }
  }
  await Share.share({ message: input.message })
}

export async function shareText(message: string) {
  await Share.share({ message })
}
