import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { resolveTheme, toggleTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

// Alterna claro/escuro. Mostra o ícone do tema para o qual vai trocar.
// Por padrão combina com superfícies neutras; passe `className` para superfícies
// coloridas (ex.: o header em bg-primary).
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setThemeState] = useState(resolveTheme)
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setThemeState(toggleTheme())}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
        className,
      )}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  )
}
