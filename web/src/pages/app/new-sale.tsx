import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Trash2, Plus } from 'lucide-react'
import { fetchCustomers } from '@/api/customers'
import { calculateSale, createSale, CalculateBody } from '@/api/sales'
import { SaleType, CalculationResult } from '@/api/types'
import { formatCurrency, reaisToCents } from '@/lib/utils'
import { queryClient } from '@/lib/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'

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

  const [customerId, setCustomerId] = useState('')
  const [type, setType] = useState<SaleType>('MANUAL')
  const [description, setDescription] = useState('')
  const [productValue, setProductValue] = useState('')
  const [productCost, setProductCost] = useState('')
  const [downPayment, setDownPayment] = useState('')
  const [interest, setInterest] = useState('50')
  const [installments, setInstallments] = useState('3')
  const [finalValue, setFinalValue] = useState('')
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [firstDueDate, setFirstDueDate] = useState('')

  const [preview, setPreview] = useState<CalculationResult | null>(null)

  // edição manual das parcelas (valores em reais como string)
  const [editingCustom, setEditingCustom] = useState(false)
  // Valores de cada parcela (centavos), quais foram fixadas manualmente e o total
  // a distribuir. Editar uma parcela redistribui o restante entre as não-fixadas.
  const [customCents, setCustomCents] = useState<number[]>([])
  const [pinned, setPinned] = useState<boolean[]>([])
  const [targetCents, setTargetCents] = useState(0)

  // pré-seleciona devedor se veio por ?customerId=
  useEffect(() => {
    const pre = params.get('customerId')
    if (pre) setCustomerId(pre)
    else if (customers?.length && !customerId) setCustomerId(customers[0].id)
  }, [customers, params]) // eslint-disable-line

  // monta o corpo da requisição conforme o modo / edição manual
  function buildBody(): CalculateBody | null {
    const cents = reaisToCents(productValue)
    if (!cents) return null
    const base: CalculateBody = {
      type,
      productValueInCents: cents,
      productCostInCents: reaisToCents(productCost),
      downPaymentInCents: reaisToCents(downPayment),
    }
    if (editingCustom) {
      return {
        ...base,
        customInstallmentValuesInCents: customCents,
      }
    }
    if (type === 'BY_TOTAL') {
      return {
        ...base,
        targetTotalInCents: reaisToCents(finalValue),
        installmentsCount: Number(installments) || 1,
      }
    }
    // MANUAL
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
  }, [type, productValue, downPayment, interest, installments, finalValue, editingCustom, customCents])

  // Distribui (target − fixadas) igualmente entre as parcelas NÃO fixadas, jogando
  // os centavos quebrados na última. Mantém as fixadas como estão.
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

  // liga a edição manual semeando os valores da prévia atual
  async function enableCustom() {
    const product = reaisToCents(productValue)
    if (!product) return toast.error('Informe o valor do produto primeiro.')
    let seed = preview
    if (!seed) {
      const body = buildBody()
      if (body) seed = await calculateSale(body).catch(() => null)
    }
    const values = seed?.installmentValuesInCents ?? [product]
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

  // Edita uma parcela: fixa o valor e redistribui o restante nas não-fixadas.
  function updateCustom(index: number, valueCents: number) {
    const pins = pinned.map((p, i) => (i === index ? true : p))
    const cents = customCents.map((c, i) => (i === index ? valueCents : c))
    setPinned(pins)
    setCustomCents(redistribute(cents, pins, targetCents))
  }

  function addCustomRow() {
    const n = customCents.length + 1
    setInstallments(String(n)) // sincroniza o nº de parcelas
    const cents = [...customCents, 0]
    const pins = [...pinned, false]
    setPinned(pins)
    setCustomCents(redistribute(cents, pins, targetCents))
  }

  function removeCustomRow(index: number) {
    const cents = customCents.filter((_, i) => i !== index)
    const pins = pinned.filter((_, i) => i !== index)
    setInstallments(String(Math.max(1, cents.length))) // sincroniza o nº de parcelas
    setPinned(pins)
    setCustomCents(redistribute(cents, pins, targetCents))
  }

  // Define o nº de parcelas; em edição manual, gera/ajusta os campos de parcela
  // de acordo com esse número e redistribui.
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
    },
  })

  async function handleSubmit() {
    const body = buildBody()
    if (!customerId) return toast.error('Selecione um devedor.')
    if (!body) return toast.error('Informe o valor do produto.')
    try {
      await mutateAsync({
        ...body,
        customerId,
        description: description || null,
        saleDate,
        firstDueDate: firstDueDate || undefined,
      })
      toast.success('Venda registrada!')
      navigate(`/devedores/${customerId}`)
    } catch {
      toast.error('Não foi possível registrar a venda.')
    }
  }

  if (!customers?.length) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <p className="mb-2 text-4xl">👤</p>
        Cadastre um devedor antes de registrar uma venda.
        <Button className="mt-4 w-full" onClick={() => navigate('/devedores')}>
          Ir para devedores
        </Button>
      </div>
    )
  }

  const customSum = customCents.reduce((s, c) => s + c, 0)

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <Label>Devedor *</Label>
          <select
            className="flex h-11 w-full rounded-md border border-input bg-card px-3"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Descrição do produto</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Geladeira Brastemp"
          />
        </div>

        {/* Modo */}
        <div>
          <Label>Tipo de venda</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  setType(m.value)
                  disableCustom()
                }}
                className={`rounded-md border p-2 text-xs font-medium transition ${
                  type === m.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-card text-muted-foreground'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {MODES.find((m) => m.value === type)?.hint}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Valor do produto (R$)</Label>
            <Input
              inputMode="decimal"
              value={productValue}
              onChange={(e) => setProductValue(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label>Entrada (R$)</Label>
            <Input
              inputMode="decimal"
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>

        <div>
          <Label>Custo do produto (R$)</Label>
          <Input
            inputMode="decimal"
            value={productCost}
            onChange={(e) => setProductCost(e.target.value)}
            placeholder="0,00"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Quanto você pagou — usado para calcular o lucro.
          </p>
        </div>

        {/* Campos por modo (escondidos quando editando manualmente) */}
        {!editingCustom && (
          <div className="grid grid-cols-2 gap-3">
            {type === 'BY_TOTAL' ? (
              <div>
                <Label>Valor final (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={finalValue}
                  onChange={(e) => setFinalValue(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            ) : (
              <div>
                <Label>Juros (%)</Label>
                <Input
                  inputMode="decimal"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label>Nº de parcelas</Label>
              <Input
                type="number"
                min={1}
                value={installments}
                onChange={(e) => setInstallmentCount(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Data da venda</Label>
            <Input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Vencimento da 1ª parcela</Label>
            <Input
              type="date"
              value={firstDueDate}
              onChange={(e) => setFirstDueDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              As demais caem no mesmo dia dos meses seguintes. Vazio = 1 mês após a venda.
            </p>
          </div>
        </div>

        {/* Edição manual das parcelas */}
        {editingCustom ? (
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Valor de cada parcela</p>
              <button
                type="button"
                onClick={disableCustom}
                className="text-xs text-muted-foreground underline"
              >
                cancelar edição
              </button>
            </div>
            <div className="mb-2">
              <Label>Nº de parcelas</Label>
              <Input
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
                <div key={i} className="flex items-center gap-2">
                  <span className="w-14 text-sm text-muted-foreground">
                    {i + 1}ª{pinned[i] ? ' 📌' : ''}
                  </span>
                  <CurrencyInput
                    valueInCents={c}
                    onChangeCents={(cents) => updateCustom(i, cents)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
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
            className="text-sm font-medium text-primary underline"
          >
            ✎ Editar valor de cada parcela
          </button>
        )}

        {/* Prévia */}
        {preview && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="mb-2 text-sm font-semibold text-primary">Prévia do cálculo</p>
            <PreviewRow
              label="Restante (produto − entrada)"
              value={formatCurrency(preview.remainingInCents)}
            />
            <PreviewRow
              label={`Juros${preview.custom || type === 'BY_TOTAL' ? ' (calculado)' : ''} ${preview.interestPercent}%`}
              value={`+ ${formatCurrency(preview.interestInCents)}`}
            />
            <div className="mt-2 flex justify-between border-t border-dashed border-primary/30 pt-2 text-lg font-bold">
              <span>Total a pagar</span>
              <span>{formatCurrency(preview.totalInCents)}</span>
            </div>
            {reaisToCents(productCost) > 0 && (
              <div className="mt-1 flex justify-between text-sm font-semibold text-primary">
                <span>Lucro previsto (entrada + total − custo)</span>
                <span>
                  {formatCurrency(
                    preview.downPaymentInCents + preview.totalInCents - reaisToCents(productCost),
                  )}
                </span>
              </div>
            )}
            <p className="mt-1 font-semibold text-primary">
              {preview.installmentsCount}x
              {preview.custom
                ? ' (valores personalizados)'
                : ` de ${formatCurrency(preview.installmentValuesInCents[0])}`}
            </p>
            {preview.custom && (
              <p className="mt-1 text-xs text-muted-foreground">
                {preview.installmentValuesInCents
                  .map((c) => formatCurrency(c))
                  .join(' + ')}
              </p>
            )}
          </div>
        )}

        <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Salvando…' : 'Registrar venda'}
        </Button>
      </CardContent>
    </Card>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5 text-sm">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
