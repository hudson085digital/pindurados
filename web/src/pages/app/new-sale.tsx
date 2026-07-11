import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Trash2, Plus, UserPlus, SquarePen, Pin } from 'lucide-react'
import { ALL_RECEIPT_METHODS, RECEIPT_METHOD_LABELS } from '@pindurados/core'
import { createCustomer, fetchCustomers } from '@/api/customers'
import { fetchStockUnits } from '@/api/stock'
import { fetchOptions } from '@/api/options'
import { createProduct, fetchProducts } from '@/api/products'
import { createPurchase, receivePurchase } from '@/api/purchases'
import { StockUnit, ReceiptMethod } from '@/api/types'
import { addSaleAttachments, calculateSale, createSale, CalculateBody } from '@/api/sales'
import { updateReceipt } from '@/api/receipts'
import { SaleType, CalculationResult } from '@/api/types'
import { formatCurrency, reaisToCents, cn } from '@/lib/utils'
import { queryClient } from '@/lib/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Modo de CÁLCULO do juros (só para Promissória).
const MODES: { value: SaleType; label: string; hint: string }[] = [
  {
    value: 'MANUAL',
    label: 'Manual',
    hint: 'Você escolhe o juros e o número de parcelas.',
  },
  {
    value: 'BY_TOTAL',
    label: 'Por valor final',
    hint: 'Você informa o valor final; o juros é calculado automaticamente.',
  },
]

export function NewSale() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  })
  const { data: saleKinds } = useQuery({
    queryKey: ['options', 'SALE_KIND'],
    queryFn: () => fetchOptions('SALE_KIND'),
  })
  const { data: customerKinds } = useQuery({
    queryKey: ['options', 'CUSTOMER_KIND'],
    queryFn: () => fetchOptions('CUSTOMER_KIND'),
  })
  const { data: originOptions } = useQuery({
    queryKey: ['options', 'SALE_ORIGIN'],
    queryFn: () => fetchOptions('SALE_ORIGIN'),
  })
  const { data: deliveryOptions } = useQuery({
    queryKey: ['options', 'DELIVERY_TYPE'],
    queryFn: () => fetchOptions('DELIVERY_TYPE'),
  })
  const { data: stock } = useQuery({
    queryKey: ['stock-units', 'AVAILABLE'],
    queryFn: () => fetchStockUnits({ status: 'AVAILABLE' }),
  })

  const [customerId, setCustomerId] = useState('')
  const [saleKindId, setSaleKindId] = useState('')
  const [customerKind, setCustomerKind] = useState('')
  const [type, setType] = useState<SaleType>('MANUAL')
  const [downPayment, setDownPayment] = useState('')
  const [interest, setInterest] = useState('50')
  const [installments, setInstallments] = useState('3')
  const [finalValue, setFinalValue] = useState('')
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [firstDueDate, setFirstDueDate] = useState('')
  const [origin, setOrigin] = useState('')
  const [deliveryType, setDeliveryType] = useState('')
  const [methods, setMethods] = useState<ReceiptMethod[]>([])
  // por forma: valor recebido + comprovante(s) obrigatório(s)
  const [methodData, setMethodData] = useState<Record<string, { amountCents: number; files: File[] }>>({})

  const [preview, setPreview] = useState<CalculationResult | null>(null)
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)
  const [quickStockOpen, setQuickStockOpen] = useState(false)
  // Fotos opcionais da venda: múltiplos anexos, rótulo opcional por linha.
  const [photoRows, setPhotoRows] = useState<{ kind: string; files: File[] }[]>([
    { kind: '', files: [] },
  ])
  // Venda SEM produto do sistema (permitida, mas fica com alerta de registro)
  const [manualValue, setManualValue] = useState('')
  const [manualCost, setManualCost] = useState('')
  const [manualDescription, setManualDescription] = useState('')

  // Itens da venda — SEMPRE do catálogo (sem produto fora do sistema).
  const [items, setItems] = useState<{ unit: StockUnit; priceCents: number; discountCents: number }[]>([])
  const availableUnits = (stock?.units ?? []).filter(
    (u) => !items.some((i) => i.unit.id === u.id),
  )
  const itemsSumCents = items.reduce((s, i) => s + i.priceCents - i.discountCents, 0)
  const itemsCostCents = items.reduce((s, i) => s + i.unit.finalCostInCents, 0)
  const methodsSumCents = methods.reduce(
    (sum, m) => sum + (methodData[m]?.amountCents ?? 0),
    0,
  )

  // Tipo de venda: default Promissória; À vista/Cartão quitam na hora.
  const saleKind = (saleKinds ?? []).find((k) => k.id === saleKindId)
    ?? (saleKinds ?? []).find((k) => k.meta === 'INSTALLMENTS')
  const immediate = saleKind?.meta === 'IMMEDIATE'

  // Cartão pré-seleciona a forma CARD no recebimento automático.
  useEffect(() => {
    if (!immediate) return
    if (saleKind?.label === 'Cartão' && methods.length === 0) setMethods(['CARD'])
  }, [immediate, saleKind?.label]) // eslint-disable-line

  function addItem(unitId: string) {
    const unit = availableUnits.find((u) => u.id === unitId)
    if (!unit) return
    setItems((prev) => [
      ...prev,
      {
        unit,
        priceCents: unit.product.suggestedPriceInCents ?? unit.finalCostInCents,
        discountCents: 0,
      },
    ])
  }

  // edição manual das parcelas (Promissória)
  const [editingCustom, setEditingCustom] = useState(false)
  const [customCents, setCustomCents] = useState<number[]>([])
  const [pinned, setPinned] = useState<boolean[]>([])
  const [targetCents, setTargetCents] = useState(0)

  // pré-seleciona cliente se veio por ?customerId=
  useEffect(() => {
    const pre = params.get('customerId')
    if (pre) setCustomerId(pre)
    else if (customers?.length && !customerId) setCustomerId(customers[0].id)
  }, [customers, params]) // eslint-disable-line

  // tipo de cliente padrão = o do cadastro do cliente
  useEffect(() => {
    const customer = customers?.find((c) => c.id === customerId)
    if (customer?.kind && !customerKind) setCustomerKind(customer.kind)
  }, [customerId, customers]) // eslint-disable-line

  function buildBody(): CalculateBody | null {
    const valueCents = itemsSumCents > 0 ? itemsSumCents : reaisToCents(manualValue)
    if (!valueCents) return null
    const base: CalculateBody = {
      type: immediate ? 'MANUAL' : type,
      productValueInCents: valueCents,
      productCostInCents: itemsSumCents > 0 ? 0 : reaisToCents(manualCost),
      downPaymentInCents: immediate ? 0 : reaisToCents(downPayment),
    }
    if (immediate) {
      return { ...base, interestPercent: 0, installmentsCount: 1 }
    }
    if (editingCustom) {
      return { ...base, customInstallmentValuesInCents: customCents }
    }
    if (type === 'BY_TOTAL') {
      return {
        ...base,
        targetTotalInCents: reaisToCents(finalValue),
        installmentsCount: Number(installments) || 1,
      }
    }
    return {
      ...base,
      interestPercent: Number(interest) || 0,
      installmentsCount: Number(installments) || 1,
    }
  }

  // recalcula a prévia (com debounce)
  useEffect(() => {
    const body = buildBody()
    if (!body) {
      setPreview(null)
      return
    }
    const t = setTimeout(() => {
      calculateSale(body).then(setPreview).catch(() => setPreview(null))
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line
  }, [type, downPayment, interest, installments, finalValue, editingCustom, customCents, itemsSumCents, immediate, manualValue, manualCost])

  function redistribute(cents: number[], pins: boolean[], target: number): number[] {
    const autoIdx = cents.map((_, i) => i).filter((i) => !pins[i])
    if (autoIdx.length === 0) return cents
    const pinnedSum = cents.reduce((s, c, i) => s + (pins[i] ? c : 0), 0)
    const remaining = Math.max(0, target - pinnedSum)
    const base = Math.floor(remaining / autoIdx.length)
    const result = [...cents]
    autoIdx.forEach((idx, k) => {
      result[idx] = k === autoIdx.length - 1 ? remaining - base * (autoIdx.length - 1) : base
    })
    return result
  }

  async function enableCustom() {
    if (!itemsSumCents) return toast.error('Adicione itens do estoque primeiro.')
    let seed = preview
    if (!seed) {
      const body = buildBody()
      if (body) seed = await calculateSale(body).catch(() => null)
    }
    const values = seed?.installmentValuesInCents ?? [itemsSumCents]
    const total = seed?.totalInCents ?? values.reduce((s, c) => s + c, 0)
    setCustomCents(values)
    setPinned(values.map(() => false))
    setTargetCents(total)
    setEditingCustom(true)
  }

  function disableCustom() {
    setEditingCustom(false)
    setCustomCents([])
    setPinned([])
  }

  function updateCustom(index: number, valueCents: number) {
    const pins = pinned.map((p, i) => (i === index ? true : p))
    const cents = customCents.map((c, i) => (i === index ? valueCents : c))
    setPinned(pins)
    setCustomCents(redistribute(cents, pins, targetCents))
  }

  function addCustomRow() {
    const n = customCents.length + 1
    setInstallments(String(n))
    const cents = [...customCents, 0]
    const pins = [...pinned, false]
    setPinned(pins)
    setCustomCents(redistribute(cents, pins, targetCents))
  }

  function removeCustomRow(index: number) {
    const cents = customCents.filter((_, i) => i !== index)
    const pins = pinned.filter((_, i) => i !== index)
    setInstallments(String(Math.max(1, cents.length)))
    setPinned(pins)
    setCustomCents(redistribute(cents, pins, targetCents))
  }

  function setInstallmentCount(value: string) {
    setInstallments(value)
    if (!editingCustom) return
    const n = Math.max(1, Number(value) || 1)
    let cents = [...customCents]
    let pins = [...pinned]
    if (n < cents.length) {
      cents = cents.slice(0, n)
      pins = pins.slice(0, n)
    } else if (n > cents.length) {
      while (cents.length < n) {
        cents.push(0)
        pins.push(false)
      }
    }
    setPinned(pins)
    setCustomCents(redistribute(cents, pins, targetCents))
  }

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['stock-units'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  async function handleSubmit() {
    const body = buildBody()
    if (!customerId) return toast.error('Selecione o cliente.')
    if (!body) {
      return toast.error('Adicione itens do estoque ou informe o valor da venda.')
    }
    if (immediate && methods.length === 0) {
      return toast.error('Escolha a forma de pagamento.')
    }
    const totalCents = itemsSumCents > 0 ? itemsSumCents : reaisToCents(manualValue)
    if (immediate) {
      // cada forma precisa de comprovante; com 2+ formas, soma deve fechar o total
      for (const m of methods) {
        if (!(methodData[m]?.files.length)) {
          return toast.error(`Anexe o comprovante de ${RECEIPT_METHOD_LABELS[m]}.`)
        }
      }
      if (methods.length > 1 && methodsSumCents !== totalCents) {
        return toast.error(
          `Os valores por forma devem somar ${formatCurrency(totalCents)} — a venda só conclui com o total inteiramente recebido.`,
        )
      }
    }
    if (items.length === 0) {
      const hasKind = (kind: string) =>
        photoRows.some((r) => r.kind === kind && r.files.length > 0)
      if (!hasKind('Etiqueta') || !hasKind('Número de série')) {
        return toast.error(
          'Venda sem produto do sistema exige as fotos da Etiqueta e do Número de série.',
        )
      }
    }
    try {
      const sale = await mutateAsync({
        ...body,
        customerId,
        saleDate,
        firstDueDate: !immediate && firstDueDate ? firstDueDate : undefined,
        description: items.length === 0 ? manualDescription || undefined : undefined,
        items: items.length
          ? items.map((i) => ({
              unitId: i.unit.id,
              priceInCents: i.priceCents,
              discountInCents: i.discountCents || undefined,
            }))
          : undefined,
        origin: origin || undefined,
        deliveryType: deliveryType || undefined,
        saleKind: saleKind?.label,
        customerKind: customerKind || undefined,
        immediateMethods: immediate ? methods : undefined,
        immediateMethodAmounts:
          immediate && methods.length > 1
            ? methods.map((m) => methodData[m]?.amountCents ?? 0)
            : undefined,
      })

      // comprovantes por forma → recibo automático (marcados com a forma)
      if (immediate && sale.receipts?.[0]) {
        const proofUploads = methods.flatMap((m) =>
          (methodData[m]?.files ?? []).map((file) => ({ file, method: m })),
        )
        if (proofUploads.length) {
          await updateReceipt({
            saleId: sale.id,
            receiptId: sale.receipts[0].id,
            addAttachments: proofUploads,
          }).catch(() => toast.error('Venda ok, mas falhou anexar comprovantes.'))
        }
      }
      // fotos do produto → anexos da venda
      for (const row of photoRows) {
        if (!row.files.length) continue
        await addSaleAttachments(sale.id, row.kind, row.files).catch(() =>
          toast.error('Venda ok, mas falhou anexar fotos.'),
        )
      }

      toast.success(immediate ? 'Venda registrada e quitada!' : 'Venda registrada!')
      navigate(`/clientes/${customerId}`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      toast.error(msg ?? 'Não foi possível registrar a venda.')
    }
  }

  if (!customers?.length) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Cadastre um cliente primeiro"
        description="Toda venda pertence a um cliente. Cadastre quem vai comprar antes de registrar a venda."
        action={
          <Button className="w-full" onClick={() => navigate('/clientes')}>
            Ir para clientes
          </Button>
        }
      />
    )
  }

  const customSum = customCents.reduce((s, c) => s + c, 0)

  return (
    <div className="space-y-4">
      <PageHeader title="Nova venda" />
      <Card>
      <CardContent className="space-y-4 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="col-span-2">
            <Label htmlFor="sale-customer">Cliente *</Label>
            <div className="flex gap-2">
              <Select
                id="sale-customer"
                className="flex-1"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value)
                  setCustomerKind('')
                }}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-11 w-11 shrink-0"
                aria-label="Cadastrar novo cliente"
                title="Novo cliente"
                onClick={() => setNewCustomerOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="sale-kind">Tipo de venda</Label>
            <Select
              id="sale-kind"
              value={saleKind?.id ?? ''}
              onChange={(e) => {
                setSaleKindId(e.target.value)
                setMethods([])
              }}
            >
              {(saleKinds ?? []).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sale-customer-kind">Tipo de cliente</Label>
            <Select
              id="sale-customer-kind"
              value={customerKind}
              onChange={(e) => setCustomerKind(e.target.value)}
            >
              <option value="">—</option>
              {(customerKinds ?? []).map((k) => (
                <option key={k.id} value={k.label}>
                  {k.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Itens da venda — sempre do catálogo */}
        <div className="rounded-lg border p-3 md:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Itens da venda *</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {availableUnits.length} disponível{availableUnits.length === 1 ? '' : 'is'} no estoque
              </span>
              <Button type="button" size="sm" variant="outline" onClick={() => setQuickStockOpen(true)}>
                <Plus className="h-4 w-4" /> Novo produto
              </Button>
            </div>
          </div>

          {items.map((item, index) => (
            <div key={item.unit.id} className="mb-2 space-y-2 rounded-md bg-secondary/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.unit.product.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.unit.imei1 ? `IMEI ${item.unit.imei1}` : item.unit.serialNumber ? `SN ${item.unit.serialNumber}` : 'sem identificação'}
                    {' · custo '}{formatCurrency(item.unit.finalCostInCents)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remover item ${index + 1}`}
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 md:max-w-md">
                <div>
                  <Label htmlFor={`item-price-${index}`}>Preço (R$)</Label>
                  <CurrencyInput
                    id={`item-price-${index}`}
                    valueInCents={item.priceCents}
                    onChangeCents={(c) =>
                      setItems((prev) => prev.map((x, i) => (i === index ? { ...x, priceCents: c } : x)))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`item-discount-${index}`}>Desconto (R$)</Label>
                  <CurrencyInput
                    id={`item-discount-${index}`}
                    valueInCents={item.discountCents}
                    onChangeCents={(c) =>
                      setItems((prev) => prev.map((x, i) => (i === index ? { ...x, discountCents: c } : x)))
                    }
                  />
                </div>
              </div>
            </div>
          ))}

          {availableUnits.length > 0 && (
            <Select
              aria-label="Adicionar item do estoque"
              value=""
              onChange={(e) => e.target.value && addItem(e.target.value)}
            >
              <option value="">+ Adicionar item do estoque…</option>
              {availableUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.product.name}
                  {u.imei1 ? ` · IMEI ${u.imei1.slice(-6)}` : u.serialNumber ? ` · SN ${u.serialNumber}` : ''}
                  {` · custo ${formatCurrency(u.finalCostInCents)}`}
                </option>
              ))}
            </Select>
          )}

          {items.length === 0 && (
            <div className="mt-3 space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Venda sem produto do sistema: permitida, mas as fotos da
                Etiqueta e do Número de série são OBRIGATÓRIAS, e a venda fica
                com o alerta até você vincular o produto registrado.
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div>
                  <Label htmlFor="manual-value">Valor da venda (R$) *</Label>
                  <Input
                    id="manual-value"
                    inputMode="decimal"
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="manual-cost">Custo (R$)</Label>
                  <Input
                    id="manual-cost"
                    inputMode="decimal"
                    value={manualCost}
                    onChange={(e) => setManualCost(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label htmlFor="manual-desc">Descrição</Label>
                  <Input
                    id="manual-desc"
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    placeholder="Ex.: iPhone 16 lacrado"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="sale-origin">Origem da venda</Label>
            <Select id="sale-origin" value={origin} onChange={(e) => setOrigin(e.target.value)}>
              <option value="">Opcional…</option>
              {(originOptions ?? []).map((o) => (
                <option key={o.id} value={o.label}>{o.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sale-delivery">Entrega</Label>
            <Select id="sale-delivery" value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
              <option value="">Opcional…</option>
              {(deliveryOptions ?? []).map((o) => (
                <option key={o.id} value={o.label}>{o.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sale-date">Data da venda</Label>
            <DatePicker id="sale-date" value={saleDate} onChange={setSaleDate} />
          </div>
          {!immediate && (
            <div>
              <Label htmlFor="sale-first-due">Vencimento da 1ª parcela</Label>
              <DatePicker
                id="sale-first-due"
                value={firstDueDate}
                onChange={setFirstDueDate}
                placeholder="1 mês após a venda"
                clearable
              />
            </div>
          )}
        </div>

        {/* À vista / Cartão: recebimento por forma — valor + comprovante */}
        {immediate && (() => {
          const totalCents = itemsSumCents > 0 ? itemsSumCents : reaisToCents(manualValue)
          const remaining = totalCents - methodsSumCents
          return (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <Label>Forma de pagamento *</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {ALL_RECEIPT_METHODS.map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={methods.includes(m) ? 'default' : 'outline'}
                  onClick={() =>
                    setMethods((prev) =>
                      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
                    )
                  }
                >
                  {RECEIPT_METHOD_LABELS[m]}
                </Button>
              ))}
            </div>

            {methods.length > 0 && (
              <div className="mt-3 space-y-2">
                {methods.map((m) => (
                  <div key={m} className="grid items-end gap-2 rounded-md bg-card p-3 shadow-sm md:grid-cols-3">
                    <div>
                      <Label htmlFor={`pay-amount-${m}`}>
                        {RECEIPT_METHOD_LABELS[m]} — valor (R$) *
                      </Label>
                      {methods.length === 1 ? (
                        <Input
                          id={`pay-amount-${m}`}
                          value={(totalCents / 100).toFixed(2).replace('.', ',')}
                          disabled
                        />
                      ) : (
                        <CurrencyInput
                          id={`pay-amount-${m}`}
                          valueInCents={methodData[m]?.amountCents ?? 0}
                          onChangeCents={(c) =>
                            setMethodData((prev) => ({
                              ...prev,
                              [m]: { amountCents: c, files: prev[m]?.files ?? [] },
                            }))
                          }
                          placeholder="0,00"
                        />
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor={`pay-proof-${m}`}>
                        Comprovante ({RECEIPT_METHOD_LABELS[m]}) *
                      </Label>
                      <Input
                        id={`pay-proof-${m}`}
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={(e) =>
                          setMethodData((prev) => ({
                            ...prev,
                            [m]: {
                              amountCents: prev[m]?.amountCents ?? 0,
                              files: Array.from(e.target.files ?? []),
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}

                {methods.length > 1 && (
                  <p
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      remaining === 0 ? 'text-success' : 'text-destructive',
                    )}
                  >
                    Recebido {formatCurrency(methodsSumCents)} de {formatCurrency(totalCents)}
                    {remaining > 0 && ` — faltam ${formatCurrency(remaining)}`}
                    {remaining < 0 && ` — ${formatCurrency(-remaining)} a mais`}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  A venda só conclui com o valor inteiramente recebido e um
                  comprovante por forma (dinheiro = foto do dinheiro).
                </p>
              </div>
            )}
          </div>
          )
        })()}

        {/* Promissória: entrada, cálculo do juros, parcelas */}
        {!immediate && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="sale-down-payment">Entrada (R$)</Label>
                <Input
                  id="sale-down-payment"
                  inputMode="decimal"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>Cálculo do juros</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setType(m.value)
                        disableCustom()
                      }}
                      title={m.hint}
                      className={cn(
                        'min-h-[44px] rounded-md border p-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                        type === m.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-input bg-card text-muted-foreground hover:border-border hover:text-foreground',
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {!editingCustom && (
                <>
                  {type === 'BY_TOTAL' ? (
                    <div>
                      <Label htmlFor="sale-final-value">Valor final (R$)</Label>
                      <Input
                        id="sale-final-value"
                        inputMode="decimal"
                        value={finalValue}
                        onChange={(e) => setFinalValue(e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="sale-interest">Juros (%)</Label>
                      <Input
                        id="sale-interest"
                        inputMode="decimal"
                        value={interest}
                        onChange={(e) => setInterest(e.target.value)}
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="sale-installments">Nº de parcelas</Label>
                    <Input
                      id="sale-installments"
                      type="number"
                      min={1}
                      value={installments}
                      onChange={(e) => setInstallmentCount(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {editingCustom ? (
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">Valor de cada parcela</p>
                  <button
                    type="button"
                    onClick={disableCustom}
                    className="inline-flex min-h-[36px] items-center rounded-md px-2 text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    cancelar edição
                  </button>
                </div>
                <div className="mb-2 md:max-w-xs">
                  <Label htmlFor="custom-installments">Nº de parcelas</Label>
                  <Input
                    id="custom-installments"
                    type="number"
                    min={1}
                    value={installments}
                    onChange={(e) => setInstallmentCount(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Total a distribuir: <strong>{formatCurrency(targetCents)}</strong>. Editar uma
                    parcela fixa o valor; as demais se ajustam sozinhas.
                  </p>
                </div>
                <div className="space-y-2">
                  {customCents.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 md:max-w-md">
                      <span className="inline-flex w-14 items-center gap-1 text-sm text-muted-foreground">
                        {i + 1}ª
                        {pinned[i] && <Pin className="h-3.5 w-3.5 text-primary" aria-label="valor fixado" />}
                      </span>
                      <CurrencyInput
                        aria-label={`Valor da ${i + 1}ª parcela`}
                        valueInCents={c}
                        onChangeCents={(cents) => updateCustom(i, cents)}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Remover ${i + 1}ª parcela`}
                        onClick={() => removeCustomRow(i)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={addCustomRow}
                >
                  <Plus className="h-4 w-4" /> Adicionar parcela
                </Button>
                <p className="mt-2 text-sm">
                  Soma das parcelas:{' '}
                  <strong className={customSum !== targetCents ? 'text-destructive' : ''}>
                    {formatCurrency(customSum)}
                  </strong>
                  {customSum !== targetCents && ` (alvo ${formatCurrency(targetCents)})`}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={enableCustom}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <SquarePen className="h-4 w-4" /> Editar valor de cada parcela
              </button>
            )}
          </>
        )}

        {/* Fotos da venda: múltiplos anexos, rótulo opcional */}
        <div className="rounded-lg border p-3 md:p-4">
          <p className="mb-1 text-sm font-semibold">
            Fotos da venda {items.length === 0 ? '(obrigatório: etiqueta + nº de série)' : '(opcional)'}
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            Fotos do produto: etiqueta do marketplace, nº de série, entrega
            (motoqueiro/Uber)… Comprovantes de pagamento ficam na seção de
            pagamento.
          </p>
          <div className="space-y-2">
            {photoRows.map((row, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="max-w-xs flex-1"
                  aria-label={`Fotos ${index + 1}`}
                  onChange={(e) =>
                    setPhotoRows((prev) =>
                      prev.map((r, i) =>
                        i === index ? { ...r, files: Array.from(e.target.files ?? []) } : r,
                      ),
                    )
                  }
                />
                <Select
                  aria-label="Rótulo da foto (opcional)"
                  className="w-56"
                  value={row.kind}
                  onChange={(e) =>
                    setPhotoRows((prev) =>
                      prev.map((r, i) => (i === index ? { ...r, kind: e.target.value } : r)),
                    )
                  }
                >
                  <option value="">Sem rótulo</option>
                  <option value="Etiqueta">Etiqueta (marketplace)</option>
                  <option value="Número de série">Número de série</option>
                  <option value="Entrega">Comprovante de entrega</option>
                </Select>
                {photoRows.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remover linha de fotos"
                    onClick={() => setPhotoRows((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => setPhotoRows((prev) => [...prev, { kind: '', files: [] }])}
          >
            <Plus className="h-4 w-4" /> Mais fotos
          </Button>
        </div>

        {/* Prévia */}
        {preview && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="mb-2 text-sm font-semibold text-primary">Prévia</p>
            {!immediate && (
              <>
                <PreviewRow
                  label="Restante (itens − entrada)"
                  value={formatCurrency(preview.remainingInCents)}
                />
                <PreviewRow
                  label={`Juros${preview.custom || type === 'BY_TOTAL' ? ' (calculado)' : ''} ${preview.interestPercent}%`}
                  value={`+ ${formatCurrency(preview.interestInCents)}`}
                />
              </>
            )}
            <div className="mt-2 flex justify-between border-t border-dashed border-primary/30 pt-2 font-display text-lg font-bold">
              <span>{immediate ? 'Total (quitado na hora)' : 'Total a pagar'}</span>
              <span className="tabular-nums">{formatCurrency(preview.totalInCents)}</span>
            </div>
            {(() => {
              const effectiveCost = itemsSumCents > 0 ? itemsCostCents : reaisToCents(manualCost)
              if (effectiveCost <= 0) return null
              const revenue = preview.downPaymentInCents + preview.totalInCents
              const profit = revenue - effectiveCost
              const margin = revenue > 0 ? (profit / revenue) * 100 : 0
              const markup = (profit / effectiveCost) * 100
              return (
                <>
                  <div
                    className={cn(
                      'mt-1 flex justify-between text-sm font-semibold',
                      profit >= 0 ? 'text-success' : 'text-destructive',
                    )}
                  >
                    <span>{profit >= 0 ? 'Lucro previsto' : 'Prejuízo previsto'}</span>
                    <span className="tabular-nums">{formatCurrency(profit)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Margem {margin.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
                    <span>Mark-up {markup.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
                  </div>
                </>
              )
            })()}
            {!immediate && (
              <p className="mt-1 font-semibold text-primary">
                {preview.installmentsCount}x
                {preview.custom
                  ? ' (valores personalizados)'
                  : ` de ${formatCurrency(preview.installmentValuesInCents[0])}`}
              </p>
            )}
          </div>
        )}

        <Button className="w-full" onClick={handleSubmit} loading={isPending}>
          {immediate ? 'Registrar venda quitada' : 'Registrar venda'}
        </Button>
      </CardContent>
      </Card>

      <NewCustomerDialog
        open={newCustomerOpen}
        onOpenChange={setNewCustomerOpen}
        onCreated={(id) => {
          queryClient.invalidateQueries({ queryKey: ['customers'] })
          setCustomerId(id)
        }}
      />
      <QuickStockDialog
        open={quickStockOpen}
        onOpenChange={setQuickStockOpen}
        onCreated={async (unitId) => {
          await queryClient.invalidateQueries({ queryKey: ['stock-units'] })
          const fresh = await fetchStockUnits({ status: 'AVAILABLE' })
          const unit = fresh.units.find((u) => u.id === unitId)
          if (unit) {
            setItems((prev) => [
              ...prev,
              {
                unit,
                priceCents: unit.product.suggestedPriceInCents ?? unit.finalCostInCents,
                discountCents: 0,
              },
            ])
          }
        }}
      />
    </div>
  )
}

// Cadastro rápido de cliente sem sair da venda (nome basta; resto opcional).
function NewCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: (customerId: string) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [kind, setKind] = useState('')
  const { data: kinds } = useQuery({
    queryKey: ['options', 'CUSTOMER_KIND'],
    queryFn: () => fetchOptions('CUSTOMER_KIND'),
    enabled: open,
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () =>
      createCustomer({ name, phone: phone || undefined, kind: kind || undefined }),
  })

  async function handleSave() {
    if (!name.trim()) return toast.error('Informe o nome.')
    try {
      const customer = await mutateAsync()
      toast.success('Cliente cadastrado!')
      onCreated(customer.id)
      onOpenChange(false)
      setName('')
      setPhone('')
      setKind('')
    } catch {
      toast.error('Não foi possível cadastrar.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <div>
          <Label htmlFor="qc-name">Nome *</Label>
          <Input id="qc-name" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="qc-phone">Contato</Label>
            <Input id="qc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 90000-0000" />
          </div>
          <div>
            <Label htmlFor="qc-kind">Tipo</Label>
            <Select id="qc-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">—</option>
              {(kinds ?? []).map((k) => (
                <option key={k.id} value={k.label}>{k.label}</option>
              ))}
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          CPF, endereço e mais dados podem ser completados depois na aba Clientes.
        </p>
        <Button className="w-full" onClick={handleSave} loading={isPending}>
          Cadastrar cliente
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// Entrada rápida no estoque sem sair da venda: produto (existente ou novo) +
// custo → cria compra recebida na hora e a unidade já entra na venda.
function QuickStockDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: (unitId: string) => void
}) {
  const [productId, setProductId] = useState('')
  const [newName, setNewName] = useState('')
  const [costCents, setCostCents] = useState(0)
  const [priceCents, setPriceCents] = useState(0)
  const [serialNumber, setSerialNumber] = useState('')
  const [imei1, setImei1] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchProducts(),
    enabled: open,
  })

  async function handleSave() {
    if (!productId && !newName.trim()) {
      return toast.error('Escolha um produto ou digite o nome do novo.')
    }
    if (!costCents) return toast.error('Informe o custo (quanto você pagou).')
    setSaving(true)
    try {
      let pid = productId
      if (!pid) {
        const product = await createProduct({
          name: newName.trim(),
          suggestedPriceInCents: priceCents || null,
        })
        pid = product.id
      }
      const today = new Date().toISOString().slice(0, 10)
      const purchase = await createPurchase({
        productId: pid,
        date: today,
        unitValueInCents: costCents,
        note: 'Entrada rápida (tela de venda)',
      })
      const unitId = purchase.units?.[0]?.id as string | undefined
      await receivePurchase(purchase.id, today, unitId
        ? [{ unitId, serialNumber: serialNumber || undefined, imei1: imei1 || undefined }]
        : undefined)
      toast.success('Produto no estoque — item adicionado à venda!')
      if (unitId) onCreated(unitId)
      onOpenChange(false)
      setProductId('')
      setNewName('')
      setCostCents(0)
      setPriceCents(0)
      setSerialNumber('')
      setImei1('')
    } catch {
      toast.error('Não foi possível dar entrada no produto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo produto no estoque</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Entrada rápida: cria a compra já recebida e a unidade entra na venda.
          Detalhes (tipo, modelo, marca…) podem ser completados na aba Loja.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="qs-product">Produto existente</Label>
            <Select
              id="qs-product"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value)
                if (e.target.value) setNewName('')
              }}
            >
              <option value="">Cadastrar novo…</option>
              {(products ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          {!productId && (
            <div>
              <Label htmlFor="qs-name">Nome do novo produto *</Label>
              <Input
                id="qs-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: JBL Boombox 4 Branca"
              />
            </div>
          )}
          <div>
            <Label htmlFor="qs-cost">Custo (R$) *</Label>
            <CurrencyInput id="qs-cost" valueInCents={costCents} onChangeCents={setCostCents} placeholder="0,00" />
          </div>
          {!productId && (
            <div>
              <Label htmlFor="qs-price">Preço de venda (R$)</Label>
              <CurrencyInput id="qs-price" valueInCents={priceCents} onChangeCents={setPriceCents} placeholder="0,00" />
            </div>
          )}
          <div>
            <Label htmlFor="qs-sn">Serial (SN)</Label>
            <Input id="qs-sn" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="qs-imei">IMEI</Label>
            <Input id="qs-imei" value={imei1} onChange={(e) => setImei1(e.target.value)} />
          </div>
        </div>
        <Button className="w-full" onClick={handleSave} loading={saving}>
          Dar entrada e adicionar à venda
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5 text-sm">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
