import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserOption, UserOptionKind } from '@/api/types'
import { createOption, fetchOptions } from '@/api/options'
import { queryClient } from '@/lib/react-query'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Select } from './select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './dialog'

// Select de lista configurável (UserOption) com "+ Nova…" abrindo um modal
// próprio para cadastrar a opção (nada de prompt do navegador).
export function OptionSelect({
  id,
  kind,
  value,
  onChange,
  placeholder,
}: {
  id: string
  kind: UserOptionKind
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [newOpen, setNewOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: options } = useQuery({
    queryKey: ['options', kind],
    queryFn: () => fetchOptions(kind),
  })

  function handleChange(next: string) {
    if (next === '__new__') {
      setLabel('')
      setNewOpen(true)
      return
    }
    onChange(next)
  }

  async function handleCreate() {
    const trimmed = label.trim()
    if (!trimmed) return toast.error('Informe o nome.')
    setSaving(true)
    try {
      await createOption({ kind, label: trimmed })
      queryClient.invalidateQueries({ queryKey: ['options', kind] })
      onChange(trimmed)
      setNewOpen(false)
      toast.success(`"${trimmed}" adicionada!`)
    } catch {
      toast.error('Não foi possível adicionar.')
    } finally {
      setSaving(false)
    }
  }

  const list = options ?? []
  return (
    <>
      <Select id={id} value={value} onChange={(e) => handleChange(e.target.value)}>
        <option value="">{placeholder}…</option>
        {list.map((o: UserOption) => (
          <option key={o.id} value={o.label}>
            {o.label}
          </option>
        ))}
        {value && !list.some((o: UserOption) => o.label === value) && (
          <option value={value}>{value}</option>
        )}
        <option value="__new__">+ Nova…</option>
      </Select>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm md:max-w-md md:p-6">
          <DialogHeader>
            <DialogTitle>Nova opção — {placeholder}</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor={`${id}-new`}>{placeholder}</Label>
            <Input
              id={`${id}-new`}
              value={label}
              autoFocus
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setNewOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleCreate} loading={saving}>
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
