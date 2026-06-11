import { cn } from '@/lib/utils'

// Bloco de carregamento. Use no lugar de spinners/"Carregando…" para preservar
// o layout e indicar onde o conteúdo vai aparecer.
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}
