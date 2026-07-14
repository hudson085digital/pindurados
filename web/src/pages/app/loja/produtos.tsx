import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Package,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'
import { ProductWithCounts, ProductTypeEntity } from '@/api/types'
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  ProductBody,
  updateProduct,
} from '@/api/products'
import {
  createProductModel,
  createProductType,
  createProductTypeField,
  deleteProductModel,
  deleteProductType,
  deleteProductTypeField,
  fetchProductTypes,
} from '@/api/catalog'
import { formatCurrency } from '@/lib/utils'
import { queryClient } from '@/lib/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Textarea } from '@/components/ui/textarea'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { OptionSelect } from '@/components/ui/option-select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Cadastro rápido de um nome (tipo/modelo) sem sair do formulário do produto.
function QuickNameDialog({
  open,
  onOpenChange,
  title,
  label,
  placeholder,
  onCreate,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  label: string
  placeholder?: string
  onCreate: (name: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return toast.error('Informe o nome.')
    setSaving(true)
    try {
      await onCreate(trimmed)
      onOpenChange(false)
      setName('')
      toast.success(`"${trimmed}" adicionado!`)
    } catch {
      toast.error('Não foi possível adicionar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm md:max-w-md md:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div>
          <Label htmlFor="quick-name">{label}</Label>
          <Input
            id="quick-name"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder={placeholder}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleCreate} loading={saving}>
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function Produtos() {
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [editing, setEditing] = useState<ProductWithCounts | null>(null)

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchProducts(),
  })
  const { data: types } = useQuery({
    queryKey: ['product-types'],
    queryFn: fetchProductTypes,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['product-types'] })
    queryClient.invalidateQueries({ queryKey: ['stock-units'] })
  }

  const { mutateAsync: remove } = useMutation({ mutationFn: deleteProduct })

  async function handleDelete(product: ProductWithCounts) {
    const ok = await confirm({
      title: `Excluir "${product.name}"?`,
      description: 'Só é possível excluir produto sem histórico de compras.',
      confirmLabel: 'Excluir',
      destructive: true,
    })
    if (!ok) return
    try {
      await remove(product.id)
      toast.success('Produto excluído.')
      invalidate()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      toast.error(msg ?? 'Não foi possível excluir.')
    }
  }

  const term = search.trim().toLowerCase()
  const filtered = term
    ? products?.filter((p) =>
        [p.name, p.brand, p.color, p.sku, p.barcode, p.productModel?.name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term)),
      )
    : products

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, marca, modelo, SKU ou código de barras"
            aria-label="Buscar produto"
            className="pl-9"
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
          <Settings2 className="h-4 w-4" /> Tipos & modelos
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      {isLoading &&
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </CardContent>
          </Card>
        ))}

      {products?.length === 0 && (
        <EmptyState
          icon={Package}
          title="Nenhum produto ainda"
          description="Cadastre um produto compondo tipo, modelo, marca e cor — ex.: JBL Boombox 4 Branca."
          action={
            <Button className="w-full" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Cadastrar produto
            </Button>
          }
        />
      )}

      {filtered?.map((p) => (
        <Card key={p.id}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {[
                  p.productType?.name,
                  p.productModel?.name,
                  p.brand,
                  p.color,
                  p.sku ? `SKU ${p.sku}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'sem classificação'}
                {p.suggestedPriceInCents
                  ? ` · venda ${formatCurrency(p.suggestedPriceInCents)}`
                  : ''}
                {p.warrantyDays ? ` · ${p.warrantyDays}d garantia` : ''}
              </p>
              <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-semibold">
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-success">
                  {p.availableCount} disponível{p.availableCount === 1 ? '' : 'is'}
                </span>
                {p.awaitingCount > 0 && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                    {p.awaitingCount} a caminho
                  </span>
                )}
                {p.soldCount > 0 && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                    {p.soldCount} vendida{p.soldCount === 1 ? '' : 's'}
                  </span>
                )}
                {p.belowMin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                    <AlertTriangle className="h-3 w-3" /> repor estoque
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Editar ${p.name}`}
                onClick={() => {
                  setEditing(p)
                  setOpen(true)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="hover:bg-destructive/10"
                aria-label={`Excluir ${p.name}`}
                onClick={() => handleDelete(p)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <ProductDialog
        open={open}
        onOpenChange={setOpen}
        product={editing}
        types={types ?? []}
        onSaved={invalidate}
      />
      <ManageCatalogDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        types={types ?? []}
        onChanged={invalidate}
      />
    </div>
  )
}

function ProductDialog({
  open,
  onOpenChange,
  product,
  types,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductWithCounts | null
  types: ProductTypeEntity[]
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [typeId, setTypeId] = useState('')
  const [modelId, setModelId] = useState('')
  const [brand, setBrand] = useState('')
  const [color, setColor] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [priceCents, setPriceCents] = useState(0)
  const [warrantyDays, setWarrantyDays] = useState('')
  const [minQuantity, setMinQuantity] = useState('')
  const [note, setNote] = useState('')
  const [meta, setMeta] = useState<Record<string, string>>({})
  const [newTypeOpen, setNewTypeOpen] = useState(false)
  const [newModelOpen, setNewModelOpen] = useState(false)

  const selectedType = types.find((t) => t.id === typeId)
  const models = selectedType?.models ?? []
  const typeFields = selectedType?.fields ?? []

  // Nome sugerido = Marca + Modelo + Cor ("JBL Boombox 4 Branca"), editável.
  const suggestedName = useMemo(() => {
    const modelName = models.find((m) => m.id === modelId)?.name
    return [brand, modelName, color].filter(Boolean).join(' ')
  }, [brand, modelId, color, models])
  const displayName = nameTouched ? name : suggestedName || name

  // sincroniza quando abre para editar
  const [seededFor, setSeededFor] = useState<string | null>(null)
  if (open && (product?.id ?? 'new') !== seededFor) {
    setSeededFor(product?.id ?? 'new')
    setName(product?.name ?? '')
    setNameTouched(!!product)
    setTypeId(product?.productTypeId ?? '')
    setModelId(product?.productModelId ?? '')
    setBrand(product?.brand ?? '')
    setColor(product?.color ?? '')
    setCategory(product?.category ?? '')
    setSubcategory(product?.subcategory ?? '')
    setSku(product?.sku ?? '')
    setBarcode(product?.barcode ?? '')
    setPriceCents(product?.suggestedPriceInCents ?? 0)
    setWarrantyDays(product?.warrantyDays ? String(product.warrantyDays) : '')
    setMinQuantity(product?.minQuantity ? String(product.minQuantity) : '')
    setNote(product?.note ?? '')
    setMeta(
      Object.fromEntries(
        Object.entries(product?.meta ?? {}).map(([k, v]) => [k, String(v ?? '')]),
      ),
    )
  }
  if (!open && seededFor !== null) setSeededFor(null)

  const { mutateAsync: save, isPending } = useMutation({
    mutationFn: async () => {
      const body: ProductBody = {
        name: displayName.trim(),
        brand: brand || null,
        color: color || null,
        category: category || null,
        subcategory: subcategory || null,
        sku: sku || null,
        barcode: barcode || null,
        productTypeId: typeId || null,
        productModelId: modelId || null,
        suggestedPriceInCents: priceCents || null,
        warrantyDays: warrantyDays ? Number(warrantyDays) : null,
        minQuantity: minQuantity ? Number(minQuantity) : null,
        note: note || null,
        // só chaves preenchidas — nada de campo vazio no produto
        meta: Object.fromEntries(
          Object.entries(meta).filter(([, v]) => v.trim() !== ''),
        ),
      }
      return product ? updateProduct(product.id, body) : createProduct(body)
    },
  })

  async function handleSave() {
    if (!displayName.trim()) {
      return toast.error('Componha o nome (marca + modelo + cor) ou digite um.')
    }
    try {
      await save()
      toast.success(product ? 'Produto atualizado.' : 'Produto cadastrado!')
      onOpenChange(false)
      onSaved()
    } catch {
      toast.error('Não foi possível salvar.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? 'Editar produto' : 'Novo produto'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="prod-type">Tipo de produto</Label>
            <Select
              id="prod-type"
              value={typeId}
              onChange={(e) => {
                if (e.target.value === '__new__') return setNewTypeOpen(true)
                setTypeId(e.target.value)
                setModelId('')
              }}
            >
              <option value="">Selecionar…</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value="__new__">+ Novo tipo…</option>
            </Select>
            <QuickNameDialog
              open={newTypeOpen}
              onOpenChange={setNewTypeOpen}
              title="Novo tipo de produto"
              label="Nome do tipo"
              placeholder="Ex.: Caixa de som"
              onCreate={async (name) => {
                const type = await createProductType(name)
                queryClient.invalidateQueries({ queryKey: ['product-types'] })
                setTypeId(type.id)
                setModelId('')
              }}
            />
          </div>
          <div>
            <Label htmlFor="prod-model">Modelo</Label>
            <Select
              id="prod-model"
              value={modelId}
              onChange={(e) => {
                if (e.target.value === '__new__') return setNewModelOpen(true)
                setModelId(e.target.value)
              }}
              disabled={!typeId}
            >
              <option value="">{typeId ? 'Selecionar…' : 'Escolha o tipo antes'}</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
              {typeId && <option value="__new__">+ Novo modelo…</option>}
            </Select>
            <QuickNameDialog
              open={newModelOpen}
              onOpenChange={setNewModelOpen}
              title="Novo modelo"
              label="Nome do modelo"
              placeholder="Ex.: Boombox 4"
              onCreate={async (name) => {
                const model = await createProductModel(typeId, name)
                queryClient.invalidateQueries({ queryKey: ['product-types'] })
                setModelId(model.id)
              }}
            />
          </div>
          <div>
            <Label htmlFor="prod-brand">Marca</Label>
            <OptionSelect id="prod-brand" kind="BRAND" value={brand} onChange={setBrand} placeholder="Marca" />
          </div>
          <div>
            <Label htmlFor="prod-color">Cor</Label>
            <OptionSelect id="prod-color" kind="COLOR" value={color} onChange={setColor} placeholder="Cor" />
          </div>
          <div>
            <Label htmlFor="prod-category">Categoria</Label>
            <OptionSelect id="prod-category" kind="CATEGORY" value={category} onChange={setCategory} placeholder="Categoria" />
          </div>
          <div>
            <Label htmlFor="prod-subcategory">Subcategoria</Label>
            <OptionSelect id="prod-subcategory" kind="SUBCATEGORY" value={subcategory} onChange={setSubcategory} placeholder="Subcategoria" />
          </div>
        </div>

        <div>
          <Label htmlFor="prod-name">Nome do produto *</Label>
          <Input
            id="prod-name"
            value={displayName}
            onChange={(e) => {
              setName(e.target.value)
              setNameTouched(true)
            }}
            placeholder="Ex.: JBL Boombox 4 Branca"
          />
          {!nameTouched && suggestedName && (
            <p className="mt-1 text-xs text-muted-foreground">
              Composto de marca + modelo + cor — edite se quiser.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="prod-sku">SKU</Label>
            <Input id="prod-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="prod-barcode">Código de barras</Label>
            <Input id="prod-barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="prod-price">Preço de venda (R$)</Label>
            <CurrencyInput id="prod-price" valueInCents={priceCents} onChangeCents={setPriceCents} placeholder="0,00" />
          </div>
          <div>
            <Label htmlFor="prod-warranty">Garantia (dias)</Label>
            <Input
              id="prod-warranty"
              type="number"
              min={0}
              value={warrantyDays}
              onChange={(e) => setWarrantyDays(e.target.value)}
              placeholder="Ex.: 90"
            />
          </div>
        </div>

        {typeFields.length > 0 && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Campos de {selectedType?.name}
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {typeFields.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={`meta-${field.id}`}>{field.label}</Label>
                  <Input
                    id={`meta-${field.id}`}
                    value={meta[field.label] ?? ''}
                    onChange={(e) =>
                      setMeta((prev) => ({ ...prev, [field.label]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Só o que você preencher é salvo — sem campos vazios no produto.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="prod-min">Estoque mínimo</Label>
            <Input
              id="prod-min"
              type="number"
              min={0}
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
              placeholder="Vazio = sem alerta"
            />
          </div>
          <div>
            <Label htmlFor="prod-note">Observações</Label>
            <Textarea id="prod-note" rows={1} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <Button className="w-full" onClick={handleSave} loading={isPending}>
          {product ? 'Salvar alterações' : 'Cadastrar produto'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// Gestão de tipos, modelos e meta fields do tipo.
function ManageCatalogDialog({
  open,
  onOpenChange,
  types,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  types: ProductTypeEntity[]
  onChanged: () => void
}) {
  const confirm = useConfirm()
  const [newType, setNewType] = useState('')
  const [newModel, setNewModel] = useState<Record<string, string>>({})
  const [newField, setNewField] = useState<Record<string, string>>({})

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['product-types'] })
    onChanged()
  }

  async function run(fn: () => Promise<unknown>, okMsg: string) {
    try {
      await fn()
      toast.success(okMsg)
      refresh()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      toast.error(msg ?? 'Não foi possível salvar.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tipos, modelos e campos</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          O tipo define os <strong>meta fields</strong> (ex.: Celular → IMEI, GB,
          saúde da bateria) e agrupa os <strong>modelos</strong> (ex.: Boombox 4).
        </p>

        <div className="flex gap-2">
          <Input
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="Novo tipo (ex.: Notebook)"
            aria-label="Novo tipo de produto"
          />
          <Button
            size="sm"
            className="h-11"
            disabled={!newType.trim()}
            onClick={() =>
              run(async () => {
                await createProductType(newType.trim())
                setNewType('')
              }, 'Tipo criado!')
            }
          >
            <Plus className="h-4 w-4" /> Tipo
          </Button>
        </div>

        <div className="max-h-[60vh] gap-3 space-y-3 overflow-y-auto pr-1 md:grid md:grid-cols-2 md:space-y-0">
          {types.map((type) => (
            <div key={type.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{type.name}</p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 hover:bg-destructive/10"
                  aria-label={`Excluir tipo ${type.name}`}
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Excluir o tipo "${type.name}"?`,
                      description:
                        'Modelos e campos dele também somem. Produtos existentes ficam sem tipo.',
                      confirmLabel: 'Excluir',
                      destructive: true,
                    })
                    if (ok) run(() => deleteProductType(type.id), 'Tipo excluído.')
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Modelos
              </p>
              <div className="flex flex-wrap gap-1">
                {type.models.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium"
                  >
                    {m.name}
                    <button
                      aria-label={`Excluir modelo ${m.name}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => run(() => deleteProductModel(m.id), 'Modelo excluído.')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {type.models.length === 0 && (
                  <span className="text-xs text-muted-foreground">nenhum modelo</span>
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
                    }, 'Modelo criado!')
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
                      onClick={() => run(() => deleteProductTypeField(f.id), 'Campo excluído.')}
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
                    }, 'Campo criado!')
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
