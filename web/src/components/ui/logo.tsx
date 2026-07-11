import { cn } from '@/lib/utils'

// Marca MOB PHONE: monograma "m" com ponto de sinal sobre o gradiente da marca
// + wordmark "mob" (bold) "phone" (regular, primary). Fonte: design/mobphone_logo_monogram.svg
function Monogram({ className, onBrand = false }: { className?: string; onBrand?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      {onBrand ? (
        <rect x="0" y="0" width="120" height="120" rx="30" fill="rgba(255,255,255,.18)" />
      ) : (
        <>
          <defs>
            <linearGradient id="mob-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F97316" />
              <stop offset="1" stopColor="#EF4444" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="120" height="120" rx="30" fill="url(#mob-grad)" />
        </>
      )}
      <path
        d="M32 90 V50 a14 14 0 0 1 28 0 v40 M60 50 a14 14 0 0 1 28 0 v40"
        fill="none"
        stroke="#fff"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="90" cy="30" r="6" fill="#fff" />
    </svg>
  )
}

export function Logo({
  className,
  size = 'md',
  onBrand = false,
}: {
  className?: string
  size?: 'md' | 'lg'
  /** Versão para superfícies com o gradiente da marca (tile translúcido + texto branco). */
  onBrand?: boolean
}) {
  const tile = size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'
  const word = size === 'lg' ? 'text-2xl' : 'text-lg'

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Monogram className={cn('shrink-0', tile)} onBrand={onBrand} />
      <span
        className={cn(
          'font-display font-bold tracking-tight',
          word,
          onBrand ? 'text-white' : 'text-foreground',
        )}
      >
        mob
        <span className={cn('font-normal', onBrand ? 'text-white/85' : 'text-primary')}>
          phone
        </span>
      </span>
    </span>
  )
}
