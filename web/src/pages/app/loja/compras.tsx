import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Coins,
  FileUp,
  PackageCheck,
  Plus,
  ShoppingCart,
  Trash2,
  Wallet,
} from 'lucide-react'
import { Purchase, PurchaseFormat } from '@/api/types'
import {
  cancelPurchase,
  createPurchase,
  creditPurchase,
  fetchPendingPanel,
  fetchPurchases,
  importPurchases,
  receivePurchase,
} from '@/api/purchases'
import { createProduct, fetchProducts } from '@/api/products'
import { fetchOptions } from '@/api/options'
import { fetchWallet, withdrawWallet } from '@/api/wallet'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
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
import { DatePicker } from '@/components/ui/date-picker'
import { OptionSelect } from '@/components/ui/option-select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Espelho client-side do cálculo da API (api/src/use-cases/purchase-cost.ts)
// para a prévia ao vivo do formulário.
function previewCost(input: {
  format: PurchaseFormat
  quantity: number
  unitValueInCents: number
  freightInCents: number
  accrualPerReal: number
  cpmInCents: number
  cashbackPercent: number
  nubankAdvance: boolean
}) {
  const goods = input.quantity * input.unitValueInCents
  const paid = goods + input.freightInCents
  let credit = 0
  if (input.format === 'MILES' && input.accrualPerReal && input.cpmInCents) {
    credit = Math.round(((goods / 100) * input.accrualPerReal * input.cpmInCents) / 1000)
  } else if (input.format === 'CASHBACK' && input.cashbackPercent) {
    credit = Math.round(goods * (input.cashbackPercent / 100))
  }
  // cashback NÃO abate o custo (vai para a carteira quando creditar)
  const final = input.format === 'CASHBACK' ? paid : paid - credit
  const nubank = input.nubankAdvance ? Math.round(final * 0.955) : null
  return { paid, credit, final, nubank }
}

export function Compras() {
  const confirm = useConfirm()
  const [params, setParams] = useSearchParams()
  const aba = params.get('aba') === 'pendencias' ? 'pendencias' : 'lista'
  const [month, setMonth] = useState('')
  const [formatFilter, setFormatFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', month, formatFilter, statusFilter],
    queryFn: () =>
      fetchPurchases({
        month: month || undefined,
        format: (formatFilter || undefined) as PurchaseFormat | undefined,
        productStatus:
          statusFilter === 'NOT_RECEIVED' || statusFilter === 'RECEIVED'
            ? (statusFilter as 'NOT_RECEIVED' | 'RECEIVED')
            : undefined,
        creditStatus:
          statusFilter === 'NOT_CREDITED' ? 'NOT_CREDITED' : undefined,
      }),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['purchases'] })
    queryClient.invalidateQueries({ queryKey: ['pending-panel'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['stock-units'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> Nova compra
        </Button>
        <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
          <FileUp className="h-4 w-4" /> Importar planilha
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-md bg-secondary p-1">
        {(
          [
            ['lista', 'Compras'],
            ['pendencias', 'Pendências'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setParams(key === 'lista' ? {} : { aba: key })}
            className={cn(
              'flex min-h-[36px] items-center justify-center rounded-sm px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              aba === key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === 'pendencias' ? (
        <PendenciasPanel onChange={invalidate} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="Filtrar por mês"
            />
            <Select
              aria-label="Filtrar por formato"
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
            >
              <option value="">Formato</option>
              <option value="NORMAL">Normal</option>
              <option value="PROMO">Promoção</option>
              <option value="MILES">Milhas</option>
              <option value="CASHBACK">Cashback</option>
            </Select>
            <Select
              aria-label="Filtrar por status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Status</option>
              <option value="NOT_RECEIVED">Não recebidos</option>
              <option value="RECEIVED">Recebidos</option>
              <option value="NOT_CREDITED">Crédito pendente</option>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {data && (
              <Card className="border-transparent bg-brand-gradient text-white shadow-md">
                <CardContent className="p-4">
                  <p className="text-sm text-white/85">
                    Investido{month ? ` em ${month}` : ' (período filtrado)'}
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                    {formatCurrency(data.investedInCents)}
                  </p>
                </CardContent>
              </Card>
            )}
            <WalletCard />
          </div>

          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-2 p-4">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-64" />
                </CardContent>
              </Card>
            ))}

          {data?.purchases.length === 0 && (
            <EmptyState
              icon={ShoppingCart}
              title="Nenhuma compra registrada"
              description="Registre suas compras de mercadoria ou importe a planilha para trazer o histórico."
            />
          )}

          {data?.purchases.map((purchase) => (
            <PurchaseCard key={purchase.id} purchase={purchase} onChange={invalidate} confirm={confirm} />
          ))}
        </>
      )}

      <NewPurchaseDialog open={newOpen} onOpenChange={setNewOpen} onSaved={invalidate} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onDone={invalidate} />
    </div>
  )
}

const FORMAT_LABEL: Record<PurchaseFormat, string> = {
  NORMAL: 'Normal',
  PROMO: 'Promoção',
  MILES: 'Milhas',
  CASHBACK: 'Cashback',
}

function PurchaseCard({
  purchase,
  onChange,
  confirm,
}: {
  purchase: Purchase
  onChange: () => void
  confirm: ReturnType<typeof useConfirm>
}) {
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [creditOpen, setCreditOpen] = useState(false)

  async function handleCancel() {
    const ok = await confirm({
      title: 'Cancelar esta compra?',
      description: 'As unidades não vendidas saem do estoque e o investimento do mês é ajustado.',
      confirmLabel: 'Cancelar compra',
      destructive: true,
    })
    if (!ok) return
    try {
      await cancelPurchase(purchase.id)
      toast.success('Compra cancelada.')
      onChange()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Não foi possível cancelar.')
    }
  }

  const hasCredit = purchase.format === 'MILES' || purchase.format === 'CASHBACK'

  return (
    <Card className={cn(purchase.canceled && 'opacity-60')}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {purchase.quantity > 1 ? `${purchase.quantity}× ` : ''}
              {purchase.product.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(purchase.date)}
              {purchase.marketplace ? ` · ${purchase.marketplace}` : ''}
              {' · '}
              {purchase.formatLabel ?? FORMAT_LABEL[purchase.format]}
              {purchase.account ? ` · ${purchase.account}` : ''}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display font-bold tabular-nums">
              {formatCurrency(purchase.finalCostInCents)}
            </p>
            <p className="text-[11px] text-muted-foreground">custo final</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Pago {formatCurrency(purchase.paidWithFreightInCents)}
          {purchase.expectedCreditInCents > 0 &&
            ` − ${purchase.format === 'MILES' ? 'milhas' : 'cashback'} ${formatCurrency(
              purchase.actualCreditInCents ?? purchase.expectedCreditInCents,
            )}`}
          {purchase.finalCostNubankInCents != null &&
            ` · Nubank ${formatCurrency(purchase.finalCostNubankInCents)}`}
        </p>

        <div className="flex flex-wrap gap-1 text-[11px] font-semibold">
          {purchase.canceled ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">cancelada</span>
          ) : (
            <>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5',
                  purchase.productStatus === 'RECEIVED'
                    ? 'bg-success/10 text-success'
                    : purchase.productStatus === 'LATE'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-secondary text-muted-foreground',
                )}
              >
                {purchase.productStatus === 'RECEIVED'
                  ? 'recebido'
                  : purchase.productStatus === 'LATE'
                    ? 'recebimento atrasado'
                    : 'aguardando produto'}
              </span>
              {hasCredit && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5',
                    purchase.creditStatus === 'CREDITED'
                      ? 'bg-success/10 text-success'
                      : purchase.creditStatus === 'LATE'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {purchase.creditStatus === 'CREDITED'
                    ? 'creditado'
                    : purchase.creditStatus === 'LATE'
                      ? 'crédito atrasado'
                      : 'crédito pendente'}
                </span>
              )}
            </>
          )}
        </div>

        {!purchase.canceled && (
          <div className="flex flex-wrap gap-2 pt-1">
            {purchase.productStatus !== 'RECEIVED' && (
              <Button size="sm" variant="outline" onClick={() => setReceiveOpen(true)}>
                <PackageCheck className="h-4 w-4" /> Receber
              </Button>
            )}
            {hasCredit && purchase.creditStatus !== 'CREDITED' && (
              <Button size="sm" variant="outline" onClick={() => setCreditOpen(true)}>
                <Coins className="h-4 w-4" /> Creditar
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleCancel}
            >
              <Trash2 className="h-4 w-4" /> Cancelar
            </Button>
          </div>
        )}

        <ReceiveDialog
          purchase={purchase}
          open={receiveOpen}
          onOpenChange={setReceiveOpen}
          onDone={onChange}
        />
        <CreditDialog
          purchase={purchase}
          open={creditOpen}
          onOpenChange={setCreditOpen}
          onDone={onChange}
        />
      </CardContent>
    </Card>
  )
}

function ReceiveDialog({
  purchase,
  open,
  onOpenChange,
  onDone,
}: {
  purchase: Purchase
  open: boolean
  onOpenChange: (o: boolean) => void
  onDone: () => void
}) {
  const [receivedAt, setReceivedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const { data: stock } = useQuery({
    queryKey: ['purchase-units', purchase.id],
    queryFn: async () => {
      const { fetchStockUnits } = await import('@/api/stock')
      return fetchStockUnits({ search: undefined })
    },
    enabled: open,
  })
  const units = (stock?.units ?? []).filter((u) => u.purchase.id === purchase.id)
  const [unitData, setUnitData] = useState<Record<string, { serialNumber: string; imei1: string; imei2: string; danfe: string }>>({})

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () =>
      receivePurchase(
        purchase.id,
        receivedAt,
        units.map((u) => ({
          unitId: u.id,
          serialNumber: unitData[u.id]?.serialNumber || undefined,
          imei1: unitData[u.id]?.imei1 || undefined,
          imei2: unitData[u.id]?.imei2 || undefined,
          danfe: unitData[u.id]?.danfe || undefined,
        })),
      ),
  })

  async function handleSave() {
    try {
      await mutateAsync()
      toast.success('Produto recebido — unidades disponíveis para venda!')
      onOpenChange(false)
      onDone()
    } catch {
      toast.error('Não foi possível marcar o recebimento.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receber produto</DialogTitle>
        </DialogHeader>
        <div>
          <Label htmlFor={`recv-date-${purchase.id}`}>Data de recebimento</Label>
          <DatePicker id={`recv-date-${purchase.id}`} value={receivedAt} onChange={setReceivedAt} />
        </div>
        {units.map((unit, index) => {
          // IMEI pertence ao TIPO (ex.: Celular) — caixa de som não mostra IMEI.
          const hasImei = (unit.product.typeFields ?? []).some((l) =>
            l.toUpperCase().startsWith('IMEI'),
          )
          return (
          <div key={unit.id} className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-semibold">
              Unidade {index + 1} · custo {formatCurrency(unit.finalCostInCents)}
            </p>
            <div className={hasImei ? 'grid grid-cols-2 gap-2 md:grid-cols-4' : 'grid grid-cols-2 gap-2'}>
              <Input
                placeholder="Serial (SN)"
                aria-label={`SN da unidade ${index + 1}`}
                value={unitData[unit.id]?.serialNumber ?? unit.serialNumber ?? ''}
                onChange={(e) =>
                  setUnitData((prev) => ({
                    ...prev,
                    [unit.id]: { serialNumber: e.target.value, imei1: prev[unit.id]?.imei1 ?? unit.imei1 ?? '', imei2: prev[unit.id]?.imei2 ?? unit.imei2 ?? '', danfe: prev[unit.id]?.danfe ?? unit.danfe ?? '' },
                  }))
                }
              />
              <Input
                placeholder="DANFE"
                aria-label={`DANFE da unidade ${index + 1}`}
                value={unitData[unit.id]?.danfe ?? unit.danfe ?? ''}
                onChange={(e) =>
                  setUnitData((prev) => ({
                    ...prev,
                    [unit.id]: { serialNumber: prev[unit.id]?.serialNumber ?? unit.serialNumber ?? '', imei1: prev[unit.id]?.imei1 ?? unit.imei1 ?? '', imei2: prev[unit.id]?.imei2 ?? unit.imei2 ?? '', danfe: e.target.value },
                  }))
                }
              />
              {hasImei && (
              <Input
                placeholder="IMEI"
                aria-label={`IMEI da unidade ${index + 1}`}
                value={unitData[unit.id]?.imei1 ?? unit.imei1 ?? ''}
                onChange={(e) =>
                  setUnitData((prev) => ({
                    ...prev,
                    [unit.id]: { serialNumber: prev[unit.id]?.serialNumber ?? unit.serialNumber ?? '', imei1: e.target.value, imei2: prev[unit.id]?.imei2 ?? unit.imei2 ?? '', danfe: prev[unit.id]?.danfe ?? unit.danfe ?? '' },
                  }))
                }
              />
              )}
              {hasImei && (
              <Input
                placeholder="IMEI 2"
                aria-label={`IMEI 2 da unidade ${index + 1}`}
                value={unitData[unit.id]?.imei2 ?? unit.imei2 ?? ''}
                onChange={(e) =>
                  setUnitData((prev) => ({
                    ...prev,
                    [unit.id]: { serialNumber: prev[unit.id]?.serialNumber ?? unit.serialNumber ?? '', imei1: prev[unit.id]?.imei1 ?? unit.imei1 ?? '', imei2: e.target.value, danfe: prev[unit.id]?.danfe ?? unit.danfe ?? '' },
                  }))
                }
              />
              )}
            </div>
          </div>
          )
        })}
        <Button className="w-full" onClick={handleSave} loading={isPending}>
          Confirmar recebimento
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function CreditDialog({
  purchase,
  open,
  onOpenChange,
  onDone,
}: {
  purchase: Purchase
  open: boolean
  onOpenChange: (o: boolean) => void
  onDone: () => void
}) {
  const [creditedAt, setCreditedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [actualCents, setActualCents] = useState(purchase.expectedCreditInCents)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => creditPurchase(purchase.id, creditedAt, actualCents),
  })

  async function handleSave() {
    try {
      await mutateAsync()
      toast.success('Crédito confirmado — custo das unidades atualizado.')
      onOpenChange(false)
      onDone()
    } catch {
      toast.error('Não foi possível confirmar o crédito.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Confirmar {purchase.format === 'MILES' ? 'milhas' : 'cashback'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Esperado: <strong>{formatCurrency(purchase.expectedCreditInCents)}</strong>.
          Ajuste se caiu diferente — unidades ainda não vendidas têm o custo recalculado.
        </p>
        <div>
          <Label htmlFor={`credit-date-${purchase.id}`}>Data do crédito</Label>
          <DatePicker id={`credit-date-${purchase.id}`} value={creditedAt} onChange={setCreditedAt} />
        </div>
        <div>
          <Label htmlFor={`credit-value-${purchase.id}`}>Valor creditado (R$)</Label>
          <CurrencyInput
            id={`credit-value-${purchase.id}`}
            valueInCents={actualCents}
            onChangeCents={setActualCents}
          />
        </div>
        <Button className="w-full" onClick={handleSave} loading={isPending}>
          Confirmar crédito
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// Modos base de cálculo disponíveis para um formato de compra customizado
// (meta da UserOption — espelha o enum aceito pela API em /options).
const PURCHASE_FORMAT_MODES = [
  { value: 'NORMAL', label: 'Compra normal' },
  { value: 'PROMO', label: 'Promoção' },
  { value: 'MILES', label: 'Milhas (acúmulo por real)' },
  { value: 'CASHBACK', label: 'Cashback (%)' },
]

// Cadastro rápido de produto sem sair do fluxo da compra — detalhes (tipo,
// modelo, marca…) podem ser completados depois na aba Produtos.
function QuickProductDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: (productId: string) => void
}) {
  const [name, setName] = useState('')
  const [priceCents, setPriceCents] = useState(0)
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return toast.error('Informe o nome do produto.')
    setSaving(true)
    try {
      const product = await createProduct({
        name: trimmed,
        suggestedPriceInCents: priceCents || null,
      })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onCreated(product.id)
      onOpenChange(false)
      setName('')
      setPriceCents(0)
      toast.success(`"${trimmed}" cadastrado!`)
    } catch {
      toast.error('Não foi possível cadastrar o produto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm md:max-w-md md:p-6">
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
        </DialogHeader>
        <div>
          <Label htmlFor="qp-name">Nome do produto *</Label>
          <Input
            id="qp-name"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Ex.: JBL Boombox 4 Branca"
          />
        </div>
        <div>
          <Label htmlFor="qp-price">Preço de venda sugerido (R$)</Label>
          <CurrencyInput id="qp-price" valueInCents={priceCents} onChangeCents={setPriceCents} placeholder="Opcional" />
        </div>
        <p className="text-xs text-muted-foreground">
          Tipo, modelo, marca e mais detalhes podem ser completados depois na
          aba Produtos.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleCreate} loading={saving}>
            Cadastrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NewPurchaseDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved: () => void
}) {
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => fetchProducts(), enabled: open })
  const { data: formats } = useQuery({
    queryKey: ['options', 'PURCHASE_FORMAT'],
    queryFn: () => fetchOptions('PURCHASE_FORMAT'),
    enabled: open,
  })

  const [productId, setProductId] = useState('')
  const [newProductOpen, setNewProductOpen] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [quantity, setQuantity] = useState('1')
  const [unitCents, setUnitCents] = useState(0)
  const [freightCents, setFreightCents] = useState(0)
  const [orderNumber, setOrderNumber] = useState('')
  const [account, setAccount] = useState('')
  const [marketplace, setMarketplace] = useState('')
  const [formatOptionId, setFormatOptionId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [accrual, setAccrual] = useState('')
  const [cpmCents, setCpmCents] = useState(0)
  const [cashbackPct, setCashbackPct] = useState('')
  const [nubank, setNubank] = useState(false)
  const [productExpected, setProductExpected] = useState('')
  const [creditExpected, setCreditExpected] = useState('')
  const [note, setNote] = useState('')

  const formatOption = (formats ?? []).find((f) => f.id === formatOptionId)
  const format = ((formatOption?.meta ?? 'NORMAL') as PurchaseFormat) || 'NORMAL'

  const preview = useMemo(
    () =>
      previewCost({
        format,
        quantity: Math.max(1, Number(quantity) || 1),
        unitValueInCents: unitCents,
        freightInCents: freightCents,
        accrualPerReal: Number(accrual.replace(',', '.')) || 0,
        cpmInCents: cpmCents,
        cashbackPercent: Number(cashbackPct.replace(',', '.')) || 0,
        nubankAdvance: nubank,
      }),
    [format, quantity, unitCents, freightCents, accrual, cpmCents, cashbackPct, nubank],
  )

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () =>
      createPurchase({
        productId,
        date,
        quantity: Math.max(1, Number(quantity) || 1),
        unitValueInCents: unitCents,
        freightInCents: freightCents,
        orderNumber: orderNumber || null,
        account: account || null,
        marketplace: marketplace || null,
        format,
        formatLabel: formatOption?.label ?? null,
        paymentMethod: paymentMethod || null,
        accrualPerReal: format === 'MILES' ? Number(accrual.replace(',', '.')) || null : null,
        cpmInCents: format === 'MILES' ? cpmCents || null : null,
        cashbackPercent: format === 'CASHBACK' ? Number(cashbackPct.replace(',', '.')) || null : null,
        nubankAdvance: nubank,
        productExpectedAt: productExpected || null,
        creditExpectedAt: creditExpected || null,
        note: note || null,
      }),
  })

  async function handleSave() {
    if (!productId) return toast.error('Escolha o produto (cadastre em Produtos).')
    if (!unitCents) return toast.error('Informe o valor pago por unidade.')
    try {
      await mutateAsync()
      toast.success('Compra registrada — unidades aguardando recebimento.')
      onOpenChange(false)
      setUnitCents(0)
      setFreightCents(0)
      setNote('')
      onSaved()
    } catch {
      toast.error('Não foi possível registrar a compra.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova compra</DialogTitle>
        </DialogHeader>

        <div>
          <Label htmlFor="pur-product">Produto *</Label>
          <Select
            id="pur-product"
            value={productId}
            onChange={(e) => {
              if (e.target.value === '__new__') return setNewProductOpen(true)
              setProductId(e.target.value)
            }}
          >
            <option value="">Selecionar…</option>
            {(products ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="__new__">+ Novo produto…</option>
          </Select>
          <QuickProductDialog
            open={newProductOpen}
            onOpenChange={setNewProductOpen}
            onCreated={setProductId}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="pur-date">Data *</Label>
            <DatePicker id="pur-date" value={date} onChange={setDate} />
          </div>
          <div>
            <Label htmlFor="pur-qty">Quantidade</Label>
            <Input id="pur-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pur-unit">Valor por unidade (R$) *</Label>
            <CurrencyInput id="pur-unit" valueInCents={unitCents} onChangeCents={setUnitCents} placeholder="0,00" />
          </div>
          <div>
            <Label htmlFor="pur-freight">Frete (R$)</Label>
            <CurrencyInput id="pur-freight" valueInCents={freightCents} onChangeCents={setFreightCents} placeholder="0,00" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="pur-marketplace">CIA / loja</Label>
            <OptionSelect
              id="pur-marketplace"
              kind="MARKETPLACE"
              value={marketplace}
              onChange={setMarketplace}
              placeholder="CIA / loja"
            />
          </div>
          <div>
            <Label htmlFor="pur-format">Formato</Label>
            <OptionSelect
              id="pur-format"
              kind="PURCHASE_FORMAT"
              value={formatOptionId}
              onChange={setFormatOptionId}
              placeholder="Formato"
              valueKey="id"
              emptyLabel="Normal"
              metaChoices={PURCHASE_FORMAT_MODES}
            />
          </div>
        </div>

        {format === 'MILES' && (
          <div className="grid grid-cols-2 gap-4 rounded-md border border-primary/20 bg-primary/5 p-4">
            <div>
              <Label htmlFor="pur-accrual">Milhas por real</Label>
              <Input id="pur-accrual" inputMode="decimal" value={accrual} onChange={(e) => setAccrual(e.target.value)} placeholder="Ex.: 6" />
            </div>
            <div>
              <Label htmlFor="pur-cpm">Valor do milheiro (R$)</Label>
              <CurrencyInput id="pur-cpm" valueInCents={cpmCents} onChangeCents={setCpmCents} placeholder="Ex.: 27,00" />
            </div>
          </div>
        )}

        {format === 'CASHBACK' && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
            <Label htmlFor="pur-cb">Cashback (%)</Label>
            <Input id="pur-cb" inputMode="decimal" value={cashbackPct} onChange={(e) => setCashbackPct(e.target.value)} placeholder="Ex.: 13" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="pur-order">Nº do pedido</Label>
            <Input id="pur-order" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pur-account">Conta usada</Label>
            <Input id="pur-account" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="CPF / e-mail / nome" />
          </div>
          <div>
            <Label htmlFor="pur-pay">Forma de pagamento</Label>
            <OptionSelect
              id="pur-pay"
              kind="PAYMENT_METHOD"
              value={paymentMethod}
              onChange={setPaymentMethod}
              placeholder="Forma de pagamento"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex min-h-[36px] cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="h-4 w-4 shrink-0" checked={nubank} onChange={(e) => setNubank(e.target.checked)} />
              Antecipação Nubank (4,5%)
            </label>
          </div>
          <div>
            <Label htmlFor="pur-prev-prod">Previsão do produto</Label>
            <DatePicker id="pur-prev-prod" value={productExpected} onChange={setProductExpected} placeholder="Opcional" clearable />
          </div>
          {(format === 'MILES' || format === 'CASHBACK') && (
            <div>
              <Label htmlFor="pur-prev-credit">Previsão do crédito</Label>
              <DatePicker id="pur-prev-credit" value={creditExpected} onChange={setCreditExpected} placeholder="Opcional" clearable />
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="pur-note">Observação (palavra-chave etc.)</Label>
          <Textarea id="pur-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {unitCents > 0 && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="mb-2 text-sm font-semibold text-primary">Prévia do custo</p>
            <div className="flex justify-between py-0.5 text-sm">
              <span>Pago com frete</span>
              <span className="tabular-nums">{formatCurrency(preview.paid)}</span>
            </div>
            {preview.credit > 0 && (
              <div className="flex justify-between py-0.5 text-sm">
                <span>
                  {format === 'MILES' ? 'Valor das milhas' : 'Cashback → carteira'}
                </span>
                <span className="tabular-nums">
                  {format === 'MILES' ? '− ' : ''}{formatCurrency(preview.credit)}
                </span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-dashed border-primary/30 pt-2 font-display text-lg font-bold">
              <span>Custo final</span>
              <span className="tabular-nums">{formatCurrency(preview.nubank ?? preview.final)}</span>
            </div>
            {preview.nubank != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Sem antecipação: {formatCurrency(preview.final)}
              </p>
            )}
          </div>
        )}

        <Button className="w-full" onClick={handleSave} loading={isPending}>
          Registrar compra
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function ImportDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onDone: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const { mutateAsync, isPending, data: report, reset } = useMutation({
    mutationFn: (f: File) => importPurchases(f),
  })

  async function handleImport() {
    if (!file) return toast.error('Escolha o arquivo .xlsx.')
    try {
      const result = await mutateAsync(file)
      toast.success(`${result.imported} compra(s) importada(s)!`)
      onDone()
    } catch {
      toast.error('Falha na importação — confira o arquivo.')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) {
          setFile(null)
          reset()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar planilha de compras</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Aceita a sua planilha "Compras de Produtos" (.xlsx) — produtos são
          criados automaticamente, com recebimentos, milhas/cashback e SN/IMEI.
        </p>
        <Input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          aria-label="Arquivo da planilha"
        />
        {report && (
          <div className="space-y-2 rounded-md border p-3 text-sm">
            <p className="flex items-center gap-1.5 font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" /> {report.imported} importadas ·{' '}
              {report.skipped.length} ignoradas
            </p>
            {report.skipped.length > 0 && (
              <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
                {report.skipped.map((s, i) => (
                  <li key={i}>
                    {s.sheet} · linha {s.line}: {s.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <Button className="w-full" onClick={handleImport} loading={isPending} disabled={!file}>
          Importar
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function PendenciasPanel({ onChange }: { onChange: () => void }) {
  const { data: panel, isLoading } = useQuery({
    queryKey: ['pending-panel'],
    queryFn: fetchPendingPanel,
  })

  if (isLoading || !panel) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* estatísticas da loja */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Produtos recebidos" value={String(panel.stats.receivedCount)} tone="success" />
        <StatCard
          label="Aguardando chegada"
          value={String(panel.stats.pendingProductsCount)}
          sub={formatCurrency(panel.stats.pendingProductsValueInCents)}
          tone={panel.stats.pendingProductsCount > 0 ? 'alert' : 'muted'}
        />
        <StatCard
          label="Milhas/cashback creditados"
          value={formatCurrency(panel.stats.creditedValueInCents)}
          tone="success"
        />
        <StatCard
          label="Créditos pendentes"
          value={formatCurrency(panel.stats.pendingCreditsValueInCents)}
          sub={`${panel.stats.pendingCreditsCount} compra(s)`}
          tone={panel.stats.pendingCreditsCount > 0 ? 'alert' : 'muted'}
        />
        <StatCard
          label="Vendas sem produto"
          value={String(panel.stats.noProductCount)}
          tone={panel.stats.noProductCount > 0 ? 'alert' : 'muted'}
        />
        <StatCard
          label="A receber (vendas a prazo)"
          value={formatCurrency(panel.stats.pendingPaymentsValueInCents)}
          sub={`${panel.stats.pendingPaymentsCount} venda(s)`}
          tone="muted"
        />
        <StatCard
          label="Parcelas vencidas"
          value={formatCurrency(panel.stats.overduePaymentsValueInCents)}
          tone={panel.stats.overduePaymentsValueInCents > 0 ? 'alert' : 'muted'}
        />
      </div>

      <PendGroup title="Produtos não recebidos">
        {panel.products.length === 0 ? (
          <p className="py-1 text-sm text-muted-foreground">Tudo recebido. 🎉</p>
        ) : (
          panel.products.map((p) => (
            <div key={p.purchaseId} className="flex items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {p.quantity > 1 ? `${p.quantity}× ` : ''}
                  {p.productName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.marketplace ?? 'sem CIA'}
                  {p.expectedAt ? ` · previsto ${formatDate(p.expectedAt)}` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold tabular-nums">{formatCurrency(p.valueInCents)}</p>
                {p.daysLate > 0 && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                    {p.daysLate}d atrasado
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </PendGroup>

      <PendGroup title="Milhas / cashback não creditados">
        {panel.credits.length === 0 ? (
          <p className="py-1 text-sm text-muted-foreground">Nenhum crédito pendente.</p>
        ) : (
          panel.credits.map((c) => (
            <div key={c.purchaseId} className="flex items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {c.formatLabel ?? (c.format === 'MILES' ? 'Milhas' : 'Cashback')}
                  {c.expectedAt ? ` · previsto ${formatDate(c.expectedAt)}` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold tabular-nums">{formatCurrency(c.expectedCreditInCents)}</p>
                {c.daysLate > 0 && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                    {c.daysLate}d atrasado
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </PendGroup>

      <PendGroup title="Vendas sem produto registrado">
        {panel.noProduct.length === 0 ? (
          <p className="py-1 text-sm text-muted-foreground">Todas as vendas têm produto vinculado. 🎉</p>
        ) : (
          panel.noProduct.map((v) => (
            <Link
              key={v.saleId}
              to={`/clientes/${v.customerId}`}
              className="flex items-center justify-between gap-2 rounded-md py-2 text-sm transition-colors first:pt-0 last:pb-0 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{v.customerName}</p>
                <p className="text-xs text-muted-foreground">
                  {v.description ?? 'Venda'} · {formatDate(v.saleDate)}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                vincular produto
              </span>
            </Link>
          ))
        )}
      </PendGroup>

      <PendGroup title="Pagamentos pendentes (vendas a prazo)">
        {panel.payments.length === 0 ? (
          <p className="py-1 text-sm text-muted-foreground">Nenhuma venda com saldo em aberto.</p>
        ) : (
          panel.payments.map((p) => (
            <Link
              key={p.saleId}
              to={`/clientes/${p.customerId}`}
              className="flex items-center justify-between gap-2 rounded-md py-2 text-sm transition-colors first:pt-0 last:pb-0 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{p.customerName}</p>
                <p className="text-xs text-muted-foreground">
                  {p.description ?? 'Venda'}
                  {p.nextDueDate ? ` · vence ${formatDate(p.nextDueDate)}` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold tabular-nums text-destructive">
                  {formatCurrency(p.balanceInCents)}
                </p>
                {p.daysLate > 0 && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                    {p.daysLate}d atrasado
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </PendGroup>
      {/* onChange reservado para ações rápidas futuras */}
      <span className="hidden">{typeof onChange}</span>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  tone = 'muted',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'success' | 'alert' | 'muted'
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={cn(
            'mt-1 font-display text-xl font-bold tabular-nums',
            tone === 'success' && 'text-success',
            tone === 'alert' && 'text-destructive',
          )}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function PendGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-2 font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
        <div className="divide-y divide-border">{children}</div>
      </CardContent>
    </Card>
  )
}

// Carteira de cashback: o cashback creditado NÃO abate o custo da compra —
// vira saldo aqui, para usar em compras futuras ou sacar (lucro puro).
function WalletCard() {
  const [open, setOpen] = useState(false)
  const [amountCents, setAmountCents] = useState(0)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: fetchWallet })

  async function handleWithdraw() {
    if (!amountCents) return toast.error('Informe o valor do saque.')
    setSaving(true)
    try {
      await withdrawWallet(amountCents, note || undefined)
      toast.success('Saque registrado — entra como ganho sem custo.')
      setAmountCents(0)
      setNote('')
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      toast.error(msg ?? 'Não foi possível sacar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" /> Carteira de cashback
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-success">
            {formatCurrency(wallet?.balanceInCents ?? 0)}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Extrato / sacar
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="md:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Carteira de cashback</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              O cashback confirmado das compras entra aqui (o custo do produto
              continua o valor original). Saque = ganho sem custo.
            </p>

            <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
              <div className="min-w-40 flex-1">
                <Label htmlFor="wd-amount">Sacar (R$)</Label>
                <CurrencyInput id="wd-amount" valueInCents={amountCents} onChangeCents={setAmountCents} placeholder="0,00" />
              </div>
              <div className="min-w-40 flex-1">
                <Label htmlFor="wd-note">Observação</Label>
                <Input id="wd-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
              </div>
              <Button onClick={handleWithdraw} loading={saving} disabled={!amountCents}>
                Sacar
              </Button>
            </div>

            <div className="max-h-72 divide-y divide-border overflow-y-auto">
              {(wallet?.entries ?? []).length === 0 && (
                <p className="py-2 text-sm text-muted-foreground">
                  Nenhum lançamento — confirme o crédito de uma compra cashback.
                </p>
              )}
              {(wallet?.entries ?? []).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {entry.kind}
                      {entry.productName ? ` · ${entry.productName}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(entry.createdAt)}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 font-semibold tabular-nums',
                      entry.amountInCents >= 0 ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {entry.amountInCents >= 0 ? '+' : ''}{formatCurrency(entry.amountInCents)}
                  </span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
