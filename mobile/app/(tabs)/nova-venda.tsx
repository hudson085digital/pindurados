import { useMemo, useState } from 'react'
import { ScrollView, View, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { calculateSale, type SaleType } from '@pindurados/core'
import { listCustomers } from '@/src/data/repositories/customers'
import { createSale } from '@/src/data/repositories/sales'
import { formatCurrency } from '@/src/lib/format'
import { todayISO } from '@/src/data/ids'
import { toastSuccess, toastError } from '@/src/lib/toast'
import { Card } from '@/src/components/ui/card'
import { Text, Muted } from '@/src/components/ui/text'
import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input'
import { CurrencyInput } from '@/src/components/ui/currency-input'
import { Label } from '@/src/components/ui/field'
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
  const [saving, setSaving] = useState(false)

  const selectedCustomer = customerId || customers?.[0]?.id || ''

  const preview = useMemo(() => {
    if (!productValue) return null
    return calculateSale({
      type,
      productValueInCents: productValue,
      downPaymentInCents: downPayment,
      interestPercent: Number(interest) || 0,
      installmentsCount: Number(installments) || 1,
      targetTotalInCents: finalValue,
    })
  }, [type, productValue, downPayment, interest, installments, finalValue])

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
    setSaving(true)
    try {
      const id = await createSale({
        customerId: selectedCustomer,
        description: description || null,
        type,
        productValueInCents: productValue,
        productCostInCents: productCost,
        downPaymentInCents: downPayment,
        interestPercent: Number(interest) || 0,
        installmentsCount: Number(installments) || 1,
        targetTotalInCents: finalValue,
        saleDate: todayISO(),
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

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-3 p-4">
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
            <Input value={installments} onChangeText={setInstallments} keyboardType="number-pad" />
          </View>
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
            {preview.installmentsCount}x de {formatCurrency(preview.installmentValuesInCents[0])}
          </Muted>
        </Card>
      ) : null}

      <Button title={saving ? 'Salvando…' : 'Registrar venda'} onPress={handleSave} disabled={saving} />
    </ScrollView>
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
