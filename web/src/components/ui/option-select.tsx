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

export interface MetaChoice {
  value: string
  label: string
}

// Select de lista configurável (UserOption) com "+ Nova…" abrindo um modal
// próprio para cadastrar a opção (nada de prompt do navegador).
// - valueKey: 'label' (padrão) usa o texto da opção como valor; 'id' usa o id
//   (formato de compra e tipo de venda guardam referência por id).
// - metaChoices: quando presente, o modal pede também o "modo base" da opção
//   (ex.: formato de compra → NORMAL/MILES/CASHBACK) e envia como meta.
// - emptyLabel: rótulo da opção vazia (padrão `${placeholder}…`); null = sem
//   opção vazia (para selects obrigatórios como o tipo de venda).
export function OptionSelect({
  id,
  kind,
  value,
  onChange,
  placeholder,
  valueKey = 'label',
  metaChoices,
  emptyLabel,
}: {
  id: string
  kind: UserOptionKind
  value: string
  onChange: (v: string) => void
  placeholder: string
  valueKey?: 'label' | 'id'
  metaChoices?: MetaChoice[]
  emptyLabel?: string | null
}) {
  const [newOpen, setNewOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [meta, setMeta] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: options } = useQuery({
    queryKey: ['options', kind],
    queryFn: () => fetchOptions(kind),
  })

  function handleChange(next: string) {
    if (next === '__new__') {
      setLabel('')
      setMeta(metaChoices?.[0]?.value ?? '')
      setNewOpen(true)
      return
    }
    onChange(next)
  }

  async function handleCreate() {
    const trimmed = label.trim()
    if (!trimmed) return toast.error('Informe o nome.')
    // Já existe? Só seleciona — sem duplicar nem quebrar o fluxo.
    const existing = list.find(
      (o) => o.label.toLowerCase() === trimmed.toLowerCase(),
    )
    if (existing) {
      onChange(valueKey === 'id' ? existing.id : existing.label)
      setNewOpen(false)
      toast.success(`"${existing.label}" já existia — selecionada.`)
      return
    }
    setSaving(true)
    try {
      const option = await createOption({
        kind,
        label: trimmed,
        meta: metaChoices ? meta || null : undefined,
      })
      queryClient.invalidateQueries({ queryKey: ['options', kind] })
      onChange(valueKey === 'id' ? option.id : trimmed)
      setNewOpen(false)
      toast.success(`"${trimmed}" adicionada!`)
    } catch {
      toast.error('Não foi possível adicionar.')
    } finally {
      setSaving(false)
    }
  }

  const list = options ?? []
  const optionValue = (o: UserOption) => (valueKey === 'id' ? o.id : o.label)
  return (
    <>
      <Select id={id} value={value} onChange={(e) => handleChange(e.target.value)}>
        {emptyLabel !== null && (
          <option value="">{emptyLabel ?? `${placeholder}…`}</option>
        )}
        {list.map((o: UserOption) => (
          <option key={o.id} value={optionValue(o)}>
            {o.label}
          </option>
        ))}
        {value && !list.some((o: UserOption) => optionValue(o) === value) && (
          <option value={value}>{valueKey === 'id' ? 'Opção removida' : value}</option>
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
          {metaChoices && (
            <div>
              <Label htmlFor={`${id}-new-meta`}>Funciona como</Label>
              <Select
                id={`${id}-new-meta`}
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
              >
                {metaChoices.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
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
