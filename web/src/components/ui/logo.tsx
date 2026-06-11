import { ReceiptText } from 'lucide-react'
import { cn } from '@/lib/utils'

// Marca do Pindurados: tijolo emerald com glifo de recibo + wordmark.
// Sem emoji — leitura "fintech limpa".
export function Logo({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'md' | 'lg'
}) {
  const tile = size === 'lg' ? 'h-11 w-11 rounded-xl' : 'h-8 w-8 rounded-lg'
  const glyph = size === 'lg' ? 'h-6 w-6' : 'h-[18px] w-[18px]'
  const word = size === 'lg' ? 'text-xl' : 'text-lg'

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center bg-primary text-primary-foreground shadow-sm',
          tile,
        )}
      >
        <ReceiptText className={glyph} strokeWidth={2.25} />
      </span>
      <span className={cn('font-semibold tracking-tight text-foreground', word)}>
        Pindurados
      </span>
    </span>
  )
}
