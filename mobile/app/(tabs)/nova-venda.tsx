import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { calculateSale, redistribute, type SaleType } from '@pindurados/core'
import { listCustomers } from '@/src/data/repositories/customers'
import { createSale } from '@/src/data/repositories/sales'
import { formatCurrency, brToISO, isoToBRDate } from '@/src/lib/format'
import { todayISO } from '@/src/data/ids'
import { toastSuccess, toastError } from '@/src/lib/toast'
import { Screen } from '@/src/components/ui/screen'
import { Card } from '@/src/components/ui/card'
import { Text, Muted } from '@/src/components/ui/text'
import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input'
import { CurrencyInput } from '@/src/components/ui/currency-input'
import { DateInput } from '@/src/components/ui/date-input'
import { Label } from '@/src/components/ui/field'
import { Tag } from '@/src/components/ui/tag'
import { TextAction } from '@/src/components/ui/text-action'
import { EmptyState } from '@/src/components/ui/empty-state'

export default function NovaVendaScreen() {
  const params = useLocalSearchParams<{ customerId?: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: listCustomers })

  const [customerId, setCustomerId] = useState<string>(params.customerId ?? '')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<SaleType>('MANUAL')
  const [productValue, setProductValue] = useState(0)
  const [productCost, setProductCost] = useState(0)
  const [downPayment, setDownPayment] = useState(0)
  const [interest, setInterest] = useState('50')
  const [installments, setInstallments] = useState('3')
  const [finalValue, setFinalValue] = useState(0)
  const [saleDate, setSaleDate] = useState(() => isoToBRDate(todayISO()))
  const [firstDue, setFirstDue] = useState('')
  // Edição manual: valores de cada parcela + quais estão "fixadas" (pin).
  const [customMode, setCustomMode] = useState(false)
  const [parcels, setParcels] = useState<number[]>([])
  const [pinned, setPinned] = useState<boolean[]>([])
  const [saving, setSaving] = useState(false)

  const selectedCustomer = customerId || customers?.[0]?.id || ''

  // Cálculo-base (sem valores manuais), usado para semear o editor e o alvo.
  function baseFor(count: number) {
    return calculateSale({
      type,
      productValueInCents: productValue,
      downPaymentInCents: downPayment,
      interestPercent: Number(interest) || 0,
      installmentsCount: count,
      targetTotalInCents: finalValue,
    })
  }

  const preview = useMemo(() => {
    if (!productValue) return null
    return calculateSale({
      type,
      productValueInCents: productValue,
      downPaymentInCents: downPayment,
      interestPercent: Number(interest) || 0,
      installmentsCount: Number(installments) || 1,
      targetTotalInCents: finalValue,
      customInstallmentValuesInCents: customMode ? parcels : undefined,
    })
  }, [type, productValue, downPayment, interest, installments, finalValue, customMode, parcels])

  function enableCustom() {
    const base = baseFor(Number(installments) || 1)
    setParcels(base.installmentValuesInCents)
    setPinned(base.installmentValuesInCents.map(() => false))
    setCustomMode(true)
  }

  function resetCustom() {
    const base = baseFor(parcels.length || 1)
    setParcels(base.installmentValuesInCents)
    setPinned(base.installmentValuesInCents.map(() => false))
  }

  function setCustomCount(text: string) {
    setInstallments(text)
    if (!customMode) return
    const base = baseFor(Number(text) || 1)
    setParcels(base.installmentValuesInCents)
    setPinned(base.installmentValuesInCents.map(() => false))
  }

  function editParcel(i: number, value: number) {
    const nextPinned = pinned.map((p, idx) => (idx === i ? true : p))
    const draft = parcels.map((x, idx) => (idx === i ? value : x))
    const target = baseFor(parcels.length).totalInCents
    setPinned(nextPinned)
    setParcels(redistribute(draft, nextPinned, target))
  }

  if (customers && customers.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState
          icon="person-add-outline"
          title="Cadastre um devedor primeiro"
          description="Toda venda fiado pertence a um cliente."
          action={<Button title="Ir para devedores" onPress={() => router.push('/devedores')} />}
        />
      </View>
    )
  }

  async function handleSave() {
    if (!selectedCustomer) return toastError('Selecione um devedor.')
    if (!productValue) return toastError('Informe o valor do produto.')
    const saleISO = brToISO(saleDate)
    if (!saleISO) return toastError('Data da venda inválida. Use dd/mm/aaaa.')
    let firstDueISO: string | undefined
    if (firstDue) {
      const parsed = brToISO(firstDue)
      if (!parsed) return toastError('Vencimento da 1ª parcela inválido (dd/mm/aaaa).')
      firstDueISO = parsed
    }
    setSaving(true)
    try {
      await createSale({
        customerId: selectedCustomer,
        description: description || null,
        type,
        productValueInCents: productValue,
        productCostInCents: productCost,
        downPaymentInCents: downPayment,
        interestPercent: Number(interest) || 0,
        installmentsCount: Number(installments) || 1,
        targetTotalInCents: finalValue,
        customInstallmentValuesInCents: customMode ? parcels : undefined,
        saleDate: saleISO,
        firstDueDate: firstDueISO,
      })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['sales', selectedCustomer] })
      toastSuccess('Venda registrada!')
      router.push(`/devedores/${selectedCustomer}`)
    } catch {
      toastError('Não foi possível registrar a venda.')
    } finally {
      setSaving(false)
    }
  }

  const customSum = parcels.reduce((s, v) => s + v, 0)

  return (
    <Screen>
      <Card className="gap-3">
        <View>
          <Label>Devedor *</Label>
          <View className="flex-row flex-wrap gap-2">
            {customers?.map((c) => (
              <Button
                key={c.id}
                title={c.name}
                variant={selectedCustomer === c.id ? 'default' : 'outline'}
                className="h-9 px-3"
                onPress={() => setCustomerId(c.id)}
              />
            ))}
          </View>
        </View>

        <View>
          <Label>Descrição do produto</Label>
          <Input value={description} onChangeText={setDescription} placeholder="Ex.: Geladeira" />
        </View>

        <View>
          <Label>Tipo de venda</Label>
          <View className="flex-row gap-2">
            <Button title="Manual" variant={type === 'MANUAL' ? 'default' : 'outline'} className="h-9 flex-1 px-3" onPress={() => setType('MANUAL')} />
            <Button title="Por valor final" variant={type === 'BY_TOTAL' ? 'default' : 'outline'} className="h-9 flex-1 px-3" onPress={() => setType('BY_TOTAL')} />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Label>Valor do produto</Label>
            <CurrencyInput valueInCents={productValue} onChangeCents={setProductValue} />
          </View>
          <View className="flex-1">
            <Label>Entrada</Label>
            <CurrencyInput valueInCents={downPayment} onChangeCents={setDownPayment} />
          </View>
        </View>

        <View>
          <Label>Custo do produto (p/ lucro)</Label>
          <CurrencyInput valueInCents={productCost} onChangeCents={setProductCost} />
        </View>

        <View className="flex-row gap-3">
          {type === 'BY_TOTAL' ? (
            <View className="flex-1">
              <Label>Valor final</Label>
              <CurrencyInput valueInCents={finalValue} onChangeCents={setFinalValue} />
            </View>
          ) : (
            <View className="flex-1">
              <Label>Juros (%)</Label>
              <Input value={interest} onChangeText={setInterest} keyboardType="number-pad" />
            </View>
          )}
          <View className="flex-1">
            <Label>Nº de parcelas</Label>
            <Input value={installments} onChangeText={setCustomCount} keyboardType="number-pad" />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Label>Data da venda</Label>
            <DateInput value={saleDate} onChangeText={setSaleDate} />
          </View>
          <View className="flex-1">
            <Label>1º vencimento</Label>
            <DateInput value={firstDue} onChangeText={setFirstDue} />
          </View>
        </View>
        {!firstDue ? <Muted>Sem 1º vencimento, usamos 1 mês após a venda.</Muted> : null}

        <View className="border-t border-border pt-1">
          {!customMode ? (
            <TextAction
              label="Editar valor de cada parcela"
              tone="primary"
              icon="create-outline"
              onPress={enableCustom}
            />
          ) : (
            <View className="gap-2">
              <View className="flex-row items-center gap-4">
                <TextAction label="Distribuir igual" tone="primary" icon="refresh-outline" onPress={resetCustom} />
                <TextAction
                  label="Cancelar edição manual"
                  icon="close"
                  onPress={() => setCustomMode(false)}
                />
              </View>
              {parcels.map((value, i) => {
                const isLast = i === parcels.length - 1
                return (
                  <View key={i} className="flex-row items-center gap-2">
                    <Text className="w-20">Parcela {i + 1}</Text>
                    <CurrencyInput
                      className="flex-1"
                      valueInCents={value}
                      onChangeCents={(v) => editParcel(i, v)}
                    />
                    {pinned[i] && !isLast ? <Tag tone="green">fixada</Tag> : null}
                  </View>
                )
              })}
              <View className="flex-row items-center justify-between">
                <Muted>Soma das parcelas</Muted>
                <Text
                  tnum
                  className={`font-semibold ${customSum === baseFor(parcels.length).totalInCents ? '' : 'text-destructive'}`}
                >
                  {formatCurrency(customSum)} de {formatCurrency(baseFor(parcels.length).totalInCents)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Card>

      {preview ? (
        <Card className="border-primary/30 bg-primary/5 gap-1">
          <Text className="font-semibold text-primary">Prévia do cálculo</Text>
          <Row label="Restante (produto − entrada)" value={formatCurrency(preview.remainingInCents)} />
          <Row label={`Juros ${preview.interestPercent}%`} value={`+ ${formatCurrency(preview.interestInCents)}`} />
          <View className="mt-1 flex-row justify-between border-t border-primary/30 pt-2">
            <Text className="text-lg font-bold">Total a pagar</Text>
            <Text tnum className="text-lg font-bold">{formatCurrency(preview.totalInCents)}</Text>
          </View>
          {productCost > 0 ? (
            <Row
              label="Lucro previsto"
              value={formatCurrency(downPayment + preview.totalInCents - productCost)}
            />
          ) : null}
          <Muted className="mt-1">
            {preview.custom
              ? `${preview.installmentsCount} parcelas (valores personalizados)`
              : `${preview.installmentsCount}x de ${formatCurrency(preview.installmentValuesInCents[0])}`}
          </Muted>
        </Card>
      ) : null}

      <Button
        title="Registrar venda"
        icon="checkmark"
        onPress={handleSave}
        loading={saving}
      />
    </Screen>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-0.5">
      <Muted>{label}</Muted>
      <Text tnum className="text-[13px]">{value}</Text>
    </View>
  )
}
