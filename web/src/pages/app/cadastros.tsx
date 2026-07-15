import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { UserOptionKind } from '@/api/types'
import {
  createProductModel,
  createProductType,
  createProductTypeField,
  deleteProductModel,
  deleteProductType,
  deleteProductTypeField,
  fetchProductTypes,
  updateProductModel,
  updateProductType,
} from '@/api/catalog'
import { createOption, deleteOption, fetchOptions, updateOption } from '@/api/options'
import { queryClient } from '@/lib/react-query'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/components/ui/confirm-dialog'

// Central de cadastros do catálogo: tipos de produto (com modelos e meta
// fields) + listas de rótulos (marca, cor, categoria…). Tudo edita/renomeia
// aqui — o modelo fica limpo ("Boombox 4"); marca e cor são listas próprias.

async function run(fn: () => Promise<unknown>, okMsg: string, onDone: () => void) {
  try {
    await fn()
    toast.success(okMsg)
    onDone()
  } catch (err) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.error(msg ?? 'Não foi possível salvar.')
  }
}

// Nome com edição inline: texto + lápis → input + confirmar/cancelar.
function InlineName({
  value,
  onSave,
  ariaLabel,
  textClassName = 'font-semibold',
}: {
  value: string
  onSave: (name: string) => void
  ariaLabel: string
  textClassName?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function confirmEdit() {
    const name = draft.trim()
    setEditing(false)
    if (!name || name === value) return
    onSave(name)
  }

  if (!editing) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span className={`truncate ${textClassName}`}>{value}</span>
        <button
          aria-label={`Renomear ${ariaLabel}`}
          className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
          onClick={() => {
            setDraft(value)
            setEditing(true)
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        className="h-8 text-sm"
        value={draft}
        autoFocus
        aria-label={`Novo nome de ${ariaLabel}`}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirmEdit()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
      <button
        aria-label="Confirmar nome"
        className="shrink-0 text-success hover:opacity-80"
        onClick={confirmEdit}
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        aria-label="Cancelar edição"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => setEditing(false)}
      >
        <X className="h-4 w-4" />
      </button>
    </span>
  )
}

// Lista editável de UserOptions (marca, cor, categoria, subcategoria).
function OptionSection({
  kind,
  title,
  placeholder,
}: {
  kind: UserOptionKind
  title: string
  placeholder: string
}) {
  const confirm = useConfirm()
  const [newLabel, setNewLabel] = useState('')
  const { data: options, isLoading } = useQuery({
    queryKey: ['options', kind],
    queryFn: () => fetchOptions(kind),
  })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['options', kind] })
    // renomear marca/cor/categoria propaga para os produtos existentes
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="font-display font-semibold">{title}</p>

        {isLoading && <Skeleton className="h-8 w-full" />}

        <div className="space-y-1">
          {(options ?? []).map((option) => (
            <div
              key={option.id}
              className="flex min-h-[36px] items-center justify-between gap-2 rounded-md px-2 hover:bg-secondary/60"
            >
              <InlineName
                value={option.label}
                ariaLabel={`${title} ${option.label}`}
                textClassName="text-sm"
                onSave={(label) =>
                  run(() => updateOption(option.id, { label }), 'Renomeada.', refresh)
                }
              />
              <button
                aria-label={`Excluir ${option.label}`}
                className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                onClick={async () => {
                  const ok = await confirm({
                    title: `Excluir "${option.label}"?`,
                    description: 'Produtos existentes mantêm o rótulo atual; a opção some das listas.',
                    confirmLabel: 'Excluir',
                    destructive: true,
                  })
                  if (ok) run(() => deleteOption(option.id), 'Excluída.', refresh)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {options?.length === 0 && (
            <p className="px-2 text-sm text-muted-foreground">Nenhum item ainda.</p>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            className="h-9 text-sm"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newLabel.trim()) {
                run(async () => {
                  await createOption({ kind, label: newLabel.trim() })
                  setNewLabel('')
                }, 'Criada!', refresh)
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!newLabel.trim()}
            onClick={() =>
              run(async () => {
                await createOption({ kind, label: newLabel.trim() })
                setNewLabel('')
              }, 'Criada!', refresh)
            }
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Tipos de produto com seus modelos e meta fields — tudo renomeável.
function TypesSection() {
  const confirm = useConfirm()
  const [newType, setNewType] = useState('')
  const [newModel, setNewModel] = useState<Record<string, string>>({})
  const [newField, setNewField] = useState<Record<string, string>>({})

  const { data: types, isLoading } = useQuery({
    queryKey: ['product-types'],
    queryFn: fetchProductTypes,
  })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['product-types'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-lg font-semibold">Tipos de produto</p>
        <div className="flex gap-2">
          <Input
            className="h-9 w-56 text-sm"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="Novo tipo (ex.: Notebook)"
            aria-label="Novo tipo de produto"
          />
          <Button
            size="sm"
            disabled={!newType.trim()}
            onClick={() =>
              run(async () => {
                await createProductType(newType.trim())
                setNewType('')
              }, 'Tipo criado!', refresh)
            }
          >
            <Plus className="h-4 w-4" /> Tipo
          </Button>
        </div>
      </div>

      {isLoading && <Skeleton className="h-32 w-full" />}

      <div className="grid gap-3 md:grid-cols-2">
        {(types ?? []).map((type) => (
          <Card key={type.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <InlineName
                  value={type.name}
                  ariaLabel={`tipo ${type.name}`}
                  onSave={(name) =>
                    run(() => updateProductType(type.id, name), 'Tipo renomeado.', refresh)
                  }
                />
                <button
                  aria-label={`Excluir tipo ${type.name}`}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Excluir o tipo "${type.name}"?`,
                      description: 'Modelos e campos dele também somem. Produtos existentes ficam sem tipo.',
                      confirmLabel: 'Excluir',
                      destructive: true,
                    })
                    if (ok) run(() => deleteProductType(type.id), 'Tipo excluído.', refresh)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Modelos
              </p>
              <div className="space-y-1">
                {type.models.map((m) => (
                  <div
                    key={m.id}
                    className="flex min-h-[32px] items-center justify-between gap-2 rounded-md px-2 hover:bg-secondary/60"
                  >
                    <InlineName
                      value={m.name}
                      ariaLabel={`modelo ${m.name}`}
                      textClassName="text-sm"
                      onSave={(name) =>
                        run(() => updateProductModel(m.id, name), 'Modelo renomeado.', refresh)
                      }
                    />
                    <button
                      aria-label={`Excluir modelo ${m.name}`}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                      onClick={() => run(() => deleteProductModel(m.id), 'Modelo excluído.', refresh)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {type.models.length === 0 && (
                  <p className="px-2 text-xs text-muted-foreground">nenhum modelo</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  className="h-9 text-sm"
                  value={newModel[type.id] ?? ''}
                  onChange={(e) => setNewModel((p) => ({ ...p, [type.id]: e.target.value }))}
                  placeholder="Novo modelo (ex.: Boombox 4)"
                  aria-label={`Novo modelo em ${type.name}`}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!(newModel[type.id] ?? '').trim()}
                  onClick={() =>
                    run(async () => {
                      await createProductModel(type.id, (newModel[type.id] ?? '').trim())
                      setNewModel((p) => ({ ...p, [type.id]: '' }))
                    }, 'Modelo criado!', refresh)
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Meta fields do tipo
              </p>
              <div className="flex flex-wrap gap-1">
                {type.fields.map((f) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {f.label}
                    <button
                      aria-label={`Excluir campo ${f.label}`}
                      className="hover:text-destructive"
                      onClick={() => run(() => deleteProductTypeField(f.id), 'Campo excluído.', refresh)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {type.fields.length === 0 && (
                  <span className="text-xs text-muted-foreground">nenhum campo</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  className="h-9 text-sm"
                  value={newField[type.id] ?? ''}
                  onChange={(e) => setNewField((p) => ({ ...p, [type.id]: e.target.value }))}
                  placeholder="Novo campo (ex.: IMEI)"
                  aria-label={`Novo campo em ${type.name}`}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!(newField[type.id] ?? '').trim()}
                  onClick={() =>
                    run(async () => {
                      await createProductTypeField(type.id, (newField[type.id] ?? '').trim())
                      setNewField((p) => ({ ...p, [type.id]: '' }))
                    }, 'Campo criado!', refresh)
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function Cadastros() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Cadastros"
        description="Tipos, modelos, marcas, cores e categorias usados no catálogo. O modelo fica limpo (ex.: Boombox 4) — marca e cor são listas separadas."
      />

      <TypesSection />

      <div className="grid gap-3 md:grid-cols-2">
        <OptionSection kind="BRAND" title="Marcas" placeholder="Nova marca (ex.: JBL)" />
        <OptionSection kind="COLOR" title="Cores" placeholder="Nova cor (ex.: Branca)" />
        <OptionSection kind="CATEGORY" title="Categorias" placeholder="Nova categoria (ex.: Áudio)" />
        <OptionSection kind="SUBCATEGORY" title="Subcategorias" placeholder="Nova subcategoria" />
      </div>
    </div>
  )
}
