import { useColorScheme } from 'react-native'

// Espelha os tokens HSL de global.css como valores JS, para o que o NativeWind
// não alcança: chrome de navegação (headers, tab bar, status bar), props de cor
// de ícones e placeholderTextColor. className continua usando hsl(var(--token)).
type Palette = {
  background: string
  foreground: string
  card: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  destructive: string
  border: string
}

const light: Palette = {
  background: 'hsl(168, 22%, 98%)',
  foreground: 'hsl(200, 24%, 14%)',
  card: 'hsl(0, 0%, 100%)',
  primary: 'hsl(162, 72%, 30%)',
  primaryForeground: 'hsl(0, 0%, 100%)',
  secondary: 'hsl(168, 28%, 95%)',
  secondaryForeground: 'hsl(200, 20%, 22%)',
  muted: 'hsl(168, 24%, 96%)',
  mutedForeground: 'hsl(205, 14%, 40%)',
  destructive: 'hsl(0, 72%, 48%)',
  border: 'hsl(168, 16%, 90%)',
}

const dark: Palette = {
  background: 'hsl(200, 28%, 8%)',
  foreground: 'hsl(168, 18%, 92%)',
  card: 'hsl(200, 24%, 11%)',
  primary: 'hsl(160, 58%, 42%)',
  primaryForeground: 'hsl(0, 0%, 100%)',
  secondary: 'hsl(200, 18%, 18%)',
  secondaryForeground: 'hsl(168, 16%, 88%)',
  muted: 'hsl(200, 18%, 16%)',
  mutedForeground: 'hsl(195, 13%, 64%)',
  destructive: 'hsl(0, 66%, 52%)',
  border: 'hsl(200, 16%, 20%)',
}

export type ThemeColors = Palette & { scheme: 'light' | 'dark' }

// Segue o tema do sistema (mesma fonte da media query em global.css).
export function useColors(): ThemeColors {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  return { ...(scheme === 'dark' ? dark : light), scheme }
}
