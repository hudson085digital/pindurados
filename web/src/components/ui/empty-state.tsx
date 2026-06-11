import { type LucideIcon } from 'lucide-react'

// Estado vazio padrão: ícone suave em círculo + uma frase que ensina + ação
// opcional. Substitui telas em branco e emojis soltos.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-[42ch] text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4 w-full max-w-xs">{action}</div>}
    </div>
  )
}
