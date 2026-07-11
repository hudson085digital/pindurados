import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Select estilo shadcn (Radix) com API COMPATÍVEL com <select> nativo:
// aceita <option> como children e dispara onChange({ target: { value } }).
// Opção com value="" vira o placeholder (Radix não aceita item de valor vazio).

const EMPTY = '__empty__'

export interface SelectProps {
  id?: string
  value?: string
  onChange?: (event: { target: { value: string } }) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
  children?: React.ReactNode
}

interface ParsedOption {
  value: string
  label: string
  disabled?: boolean
}

function parseOptions(children: React.ReactNode): {
  options: ParsedOption[]
  placeholder: string | null
} {
  const options: ParsedOption[] = []
  let placeholder: string | null = null

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type !== 'option') return
    const value = String(child.props.value ?? '')
    const label = String(
      Array.isArray(child.props.children)
        ? child.props.children.join('')
        : (child.props.children ?? ''),
    )
    if (value === '') {
      placeholder = label
      return
    }
    options.push({ value, label, disabled: child.props.disabled })
  })

  return { options, placeholder }
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ id, value, onChange, disabled, className, children, ...rest }, ref) => {
    const { options, placeholder } = parseOptions(children)
    const current = value && value !== '' ? value : EMPTY

    return (
      <div className={cn('relative', className)}>
        <SelectPrimitive.Root
          value={current}
          onValueChange={(next) =>
            onChange?.({ target: { value: next === EMPTY ? '' : next } })
          }
          disabled={disabled}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={id}
            aria-label={rest['aria-label']}
            className={cn(
              'flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-base ring-offset-background transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&>span]:min-w-0 [&>span]:truncate [&>span]:text-left',
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder ?? 'Selecionar…'} />
            <SelectPrimitive.Icon asChild>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={4}
              className="z-[60] max-h-[min(24rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-md border bg-card text-card-foreground shadow-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
            >
              <SelectPrimitive.Viewport className="p-1">
                {placeholder !== null && (
                  <SelectItem value={EMPTY} label={placeholder} muted />
                )}
                {options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    label={option.label}
                    disabled={option.disabled}
                  />
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      </div>
    )
  },
)
Select.displayName = 'Select'

function SelectItem({
  value,
  label,
  disabled,
  muted,
}: ParsedOption & { muted?: boolean }) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        'relative flex min-h-[40px] cursor-pointer select-none items-center rounded-sm py-2 pl-3 pr-9 text-sm outline-none transition-colors data-[highlighted]:bg-secondary data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        muted && 'text-muted-foreground',
      )}
    >
      <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex items-center">
        <Check className="h-4 w-4 text-primary" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select }
