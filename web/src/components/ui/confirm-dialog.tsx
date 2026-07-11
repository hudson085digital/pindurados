import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Ação perigosa: o botão de confirmar fica vermelho. */
  destructive?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

// Substitui o window.confirm() nativo por um diálogo do design system.
// Uso: const confirm = useConfirm(); if (!(await confirm({...}))) return
export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext)
  if (!fn) throw new Error('useConfirm precisa do <ConfirmProvider> no App.')
  return fn
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<(value: boolean) => void>()

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  function close(value: boolean) {
    resolver.current?.(value)
    resolver.current = undefined
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={options !== null} onOpenChange={(open) => !open && close(false)}>
        {options && (
          <DialogContent className="max-w-sm md:max-w-md md:p-6">
            <DialogHeader>
              <DialogTitle>{options.title}</DialogTitle>
              {options.description && (
                <DialogDescription>{options.description}</DialogDescription>
              )}
            </DialogHeader>
            <div className="mt-1 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => close(false)}>
                {options.cancelLabel ?? 'Cancelar'}
              </Button>
              <Button
                variant={options.destructive ? 'destructive' : 'default'}
                className="flex-1"
                autoFocus
                onClick={() => close(true)}
              >
                {options.confirmLabel ?? 'Confirmar'}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  )
}
