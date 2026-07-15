import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { format, parse } from 'date-fns'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import 'react-day-picker/dist/style.css'

// Date picker estilo shadcn: botão + calendário em popover (pt-BR).
// value/onChange em "YYYY-MM-DD" (mesmo contrato do <input type="date">).
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Escolher data',
  clearable = false,
  className,
  'aria-label': ariaLabel,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Permite limpar a data (campos opcionais). */
  clearable?: boolean
  className?: string
  'aria-label'?: string
}) {
  const [open, setOpen] = React.useState(false)
  const selected = value
    ? parse(value, 'yyyy-MM-dd', new Date())
    : undefined

  return (
    <div className={cn('relative', className)}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            id={id}
            aria-label={ariaLabel ?? placeholder}
            className={cn(
              'flex h-11 w-full items-center gap-2 rounded-md border border-input bg-card px-3 text-base ring-offset-background transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              !value && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-left">
              {selected ? format(selected, 'dd/MM/yyyy') : placeholder}
            </span>
            {clearable && value && (
              <span
                role="button"
                aria-label="Limpar data"
                tabIndex={-1}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange('')
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            // Dentro de um Dialog modal (Radix) o <body> fica com
            // pointer-events:none; o conteúdo do popover é portado p/ o body e
            // herda isso, deixando o calendário inclicável. Reabilita aqui e
            // evita que o focus-trap do Dialog roube o foco e feche o popover.
            onOpenAutoFocus={(event) => event.preventDefault()}
            className="pointer-events-auto z-[60] rounded-lg border bg-card p-3 text-card-foreground shadow-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <DayPicker
              mode="single"
              locale={ptBR}
              selected={selected}
              defaultMonth={selected}
              onSelect={(day) => {
                onChange(day ? format(day, 'yyyy-MM-dd') : '')
                setOpen(false)
              }}
              classNames={{
                day_today: 'text-primary font-semibold',
                day_selected:
                  'bg-brand-gradient !text-white rounded-md font-semibold',
              }}
              styles={{
                root: { '--rdp-accent-color': 'hsl(var(--primary))' } as React.CSSProperties,
              }}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  )
}
