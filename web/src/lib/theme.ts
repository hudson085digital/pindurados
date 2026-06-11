// Tema claro/escuro. A preferência mora em localStorage; sem preferência salva,
// segue o sistema (prefers-color-scheme). O index.html já aplica a classe antes
// da pintura para evitar flash — aqui só sincronizamos e expomos o toggle.

export type Theme = 'light' | 'dark'

const KEY = 'pindurados.theme'

export function getStoredTheme(): Theme | null {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' ? v : null
}

export function resolveTheme(): Theme {
  const stored = getStoredTheme()
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}

export function toggleTheme(): Theme {
  const next: Theme = resolveTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}
