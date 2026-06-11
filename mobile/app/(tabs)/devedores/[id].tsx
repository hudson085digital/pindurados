import { useState } from 'react'
import { ScrollView, View, Pressable, Alert, Linking } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { getCustomer } from '@/src/data/repositories/customers'
import { getSalesByCustomer, getChargeMessage, removeSale } from '@/src/data/repositories/sales'
import { createReceipt, voidReceipt } from '@/src/data/repositories/receipts'
import { markLate, unmarkLate } from '@/src/data/repositories/installments'
import { saveAttachment, attachmentUri } from '@/src/data/files'
import { shareCharge } from '@/src/lib/share'
import { toastSuccess, toastError } from '@/src/lib/toast'
import { formatCurrency, formatDate } from '@/src/lib/format'
import { todayISO } from '@/src/data/ids'
import type { DerivedSale, DerivedInstallment, ReceiptRow, ReceiptMethod } from '@/src/data/model'
import { Card } from '@/src/components/ui/card'
import { Text, Muted } from '@/src/components/ui/text'
import { Button } from '@/src/components/ui/button'
import { Tag } from '@/src/components/ui/tag'
import { Skeleton } from '@/src/components/ui/skeleton'
import { Label } from '@/src/components/ui/field'
import { CurrencyInput } from '@/src/components/ui/currency-input'

const ALL_METHODS: ReceiptMethod[] = ['PIX', 'CASH', 'CARD', 'CREDIT', 'DEBIT']
const METHOD_LABEL: Record<ReceiptMethod, string> = {
  PIX: 'Pix',
  CASH: 'Dinheiro',
  CARD: 'Cartão',
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: customer } = useQuery({ queryKey: ['customer', id], queryFn: () => getCustomer(id) })
  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', id],
    queryFn: () => getSalesByCustomer(id),
  })

  function refresh() {
    qc.invalidateQueries({ queryKey: ['sales', id] })
    qc.invalidateQueries({ queryKey: ['customers'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const balance = (sales ?? []).reduce((s, v) => s + v.balanceInCents, 0)

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-3 p-4">
      <Card className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-lg font-semibold" numberOfLines={1}>
            {customer?.name ?? '…'}
          </Text>
          <Muted>{customer?.phone || 'sem contato'}</Muted>
        </View>
        <Text tnum className={`text-lg font-bold ${balance > 0 ? 'text-destructive' : 'text-primary'}`}>
          {formatCurrency(balance)}
        </Text>
      </Card>

      <Button
        title="+ Nova venda"
        onPress={() => router.push(`/nova-venda?customerId=${id}`)}
      />

      {isLoading ? (
        <Card>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-16 w-full" />
        </Card>
      ) : sales && sales.length === 0 ? (
        <Muted className="py-6 text-center">Nenhuma venda registrada.</Muted>
      ) : (
        sales?.map((sale) => <SaleCard key={sale.id} sale={sale} onChange={refresh} />)
      )}
    </ScrollView>
  )
}

function SaleCard({ sale, onChange }: { sale: DerivedSale; onChange: () => void }) {
  const [showReceipt, setShowReceipt] = useState(false)

  async function handleCharge() {
    try {
      const { message, whatsappUrl } = await getChargeMessage(sale.id)
      await shareCharge({ message, whatsappUrl })
    } catch {
      toastError('Não foi possível gerar a cobrança.')
    }
  }

  function handleDelete() {
    Alert.alert('Excluir venda', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await removeSale(sale.id)
          toastSuccess('Venda excluída.')
          onChange()
        },
      },
    ])
  }

  return (
    <Card className="gap-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="font-semibold">{sale.description || 'Venda'}</Text>
          <Muted>
            {sale.type === 'BY_TOTAL' ? 'Por valor final' : sale.type === 'AUTOMATIC' ? 'Automática' : 'Manual'} · {formatDate(sale.saleDate)}
          </Muted>
        </View>
        {sale.settled ? (
          <View className="rounded-full bg-primary/10 px-2.5 py-1">
            <Text className="text-[11px] font-semibold uppercase text-primary">Quitada</Text>
          </View>
        ) : (
          <Text tnum className={`font-bold ${sale.balanceInCents > 0 ? 'text-destructive' : 'text-primary'}`}>
            {formatCurrency(sale.balanceInCents)}
          </Text>
        )}
      </View>

      <Muted>
        Produto {formatCurrency(sale.productValueInCents)} − entrada {formatCurrency(sale.downPaymentInCents)} + juros {sale.interestPercent}% = {formatCurrency(sale.totalInCents)} em {sale.installments.length}x
      </Muted>
      {sale.productCostInCents > 0 ? (
        <Muted>
          Custo {formatCurrency(sale.productCostInCents)} · lucro previsto{' '}
          <Text className="font-semibold text-primary">{formatCurrency(sale.profitInCents)}</Text>
        </Muted>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {!sale.settled ? (
          <Button title="Cobrar" variant="outline" className="px-3" onPress={handleCharge} />
        ) : null}
        {!sale.settled ? (
          <Button title={showReceipt ? 'Fechar' : 'Registrar recebimento'} className="px-3" onPress={() => setShowReceipt((v) => !v)} />
        ) : null}
      </View>

      {showReceipt ? (
        <ReceiptForm
          sale={sale}
          onDone={() => {
            setShowReceipt(false)
            onChange()
          }}
        />
      ) : null}

      <View className="gap-2">
        {sale.installments.map((inst) => (
          <InstallmentRow key={inst.id} inst={inst} onChange={onChange} />
        ))}
      </View>

      {sale.receipts.length > 0 ? (
        <View className="rounded-md bg-secondary/40 p-3">
          <Text className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Recebimentos
          </Text>
          {sale.receipts.map((r) => (
            <ReceiptRowView key={r.id} receipt={r} saleId={sale.id} onChange={onChange} />
          ))}
        </View>
      ) : null}

      <Pressable onPress={handleDelete} className="self-start">
        <Text className="text-[13px] text-destructive">Excluir venda</Text>
      </Pressable>
    </Card>
  )
}

function InstallmentRow({ inst, onChange }: { inst: DerivedInstallment; onChange: () => void }) {
  const statusLabel = inst.status === 'PAID' ? 'paga' : inst.status === 'PARTIAL' ? 'parcial' : 'em aberto'

  function handleLate() {
    if (inst.isLate) {
      Alert.alert('Tirar atraso', 'Remover o juros de atraso desta parcela?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Tirar',
          onPress: async () => {
            await unmarkLate(inst.id)
            onChange()
          },
        },
      ])
    } else {
      Alert.alert('Marcar atraso', 'Aplicar juros de atraso (padrão da venda) sobre o saldo em aberto?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Marcar',
          onPress: async () => {
            await markLate(inst.id, {})
            toastSuccess('Atraso registrado.')
            onChange()
          },
        },
      ])
    }
  }

  return (
    <View className="rounded-md border border-border p-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="font-medium">Parcela {inst.number}</Text>
          <Muted>Vence {formatDate(inst.dueDate)}</Muted>
          <View className="mt-1 flex-row flex-wrap gap-1">
            <Tag>{statusLabel}</Tag>
            {inst.overdue && inst.status !== 'PAID' ? <Tag tone="red">vencida</Tag> : null}
            {inst.isLate ? <Tag tone="red">+juros atraso</Tag> : null}
          </View>
        </View>
        <View className="items-end">
          <Text tnum className="font-bold">{formatCurrency(inst.effectiveInCents)}</Text>
          {inst.paidInCents > 0 && inst.balanceInCents > 0 ? (
            <Muted>falta {formatCurrency(inst.balanceInCents)}</Muted>
          ) : null}
        </View>
      </View>
      {inst.status !== 'PAID' ? (
        <Pressable onPress={handleLate} className="mt-2 self-start">
          <Text className={`text-[13px] ${inst.isLate ? 'text-primary' : 'text-destructive'}`}>
            {inst.isLate ? 'Tirar atraso' : 'Marcar atraso'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function ReceiptRowView({
  receipt,
  saleId,
  onChange,
}: {
  receipt: ReceiptRow
  saleId: string
  onChange: () => void
}) {
  const isReversal = receipt.amountInCents < 0

  function handleVoid() {
    Alert.alert('Estornar', `Estornar ${formatCurrency(Math.abs(receipt.amountInCents))}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Estornar',
        style: 'destructive',
        onPress: async () => {
          await voidReceipt(saleId, receipt.id)
          toastSuccess('Recebimento estornado.')
          onChange()
        },
      },
    ])
  }

  const methods = receipt.methods.map((m) => METHOD_LABEL[m]).join(' + ')

  return (
    <View className="flex-row items-center justify-between py-1">
      <View className="flex-1 pr-2">
        <Text className={`text-[13px] ${isReversal ? 'text-muted-foreground' : ''}`}>
          {isReversal ? '↩ Estorno ' : '✓ '}
          {formatCurrency(Math.abs(receipt.amountInCents))}
          {methods ? ` · ${methods}` : ''} · {formatDate(receipt.receivedAt)}
        </Text>
        {receipt.attachments.map((a) => (
          <Pressable key={a.id} onPress={() => Linking.openURL(attachmentUri(a.path))}>
            <Text className="text-[12px] text-primary">comprovante</Text>
          </Pressable>
        ))}
        {!isReversal && receipt.attachments.length === 0 ? (
          <Text className="text-[12px] text-destructive">⚠ sem comprovante</Text>
        ) : null}
      </View>
      {!isReversal ? (
        <Pressable onPress={handleVoid}>
          <Text className="text-[13px] text-destructive">estornar</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function ReceiptForm({ sale, onDone }: { sale: DerivedSale; onDone: () => void }) {
  const [amount, setAmount] = useState(0)
  const [methods, setMethods] = useState<ReceiptMethod[]>([])
  const [attachments, setAttachments] = useState<{ path: string; mime: string | null }[]>([])
  const [defer, setDefer] = useState(false)
  const [saving, setSaving] = useState(false)

  function toggle(m: ReceiptMethod) {
    setMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  async function pickCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return toastError('Permita o uso da câmera nas configurações.')
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 })
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0]
      const saved = await saveAttachment(a.uri, a.mimeType ?? null)
      setAttachments((p) => [...p, { path: saved.path, mime: saved.mime }])
    }
  }

  async function pickGallery() {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 })
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0]
      const saved = await saveAttachment(a.uri, a.mimeType ?? null)
      setAttachments((p) => [...p, { path: saved.path, mime: saved.mime }])
    }
  }

  async function pickPdf() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true })
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0]
      const saved = await saveAttachment(a.uri, a.mimeType ?? 'application/pdf')
      setAttachments((p) => [...p, { path: saved.path, mime: saved.mime }])
    }
  }

  async function save() {
    if (attachments.length === 0 && !defer) {
      return toastError('Anexe o comprovante ou marque "anexar depois".')
    }
    setSaving(true)
    const result = await createReceipt({
      saleId: sale.id,
      amountInCents: amount,
      methods,
      receivedAt: todayISO(),
      attachments: attachments.map((a) => ({ path: a.path, method: null, mime: a.mime })),
    })
    setSaving(false)
    if (!result.ok) return toastError(result.error)
    toastSuccess('Recebimento registrado!')
    onDone()
  }

  return (
    <View className="gap-3 rounded-md border border-border p-3">
      <Muted>Saldo: {formatCurrency(sale.balanceInCents)}</Muted>
      <View>
        <Label>Valor recebido *</Label>
        <CurrencyInput valueInCents={amount} onChangeCents={setAmount} />
      </View>
      <View>
        <Label>Forma(s) de pagamento</Label>
        <View className="flex-row flex-wrap gap-2">
          {ALL_METHODS.map((m) => (
            <Button
              key={m}
              title={METHOD_LABEL[m]}
              variant={methods.includes(m) ? 'default' : 'outline'}
              className="h-9 px-3"
              onPress={() => toggle(m)}
            />
          ))}
        </View>
      </View>
      <View>
        <Label>Comprovante</Label>
        <View className="flex-row flex-wrap gap-2">
          <Button title="Câmera" variant="outline" className="h-9 px-3" onPress={pickCamera} />
          <Button title="Galeria" variant="outline" className="h-9 px-3" onPress={pickGallery} />
          <Button title="PDF" variant="outline" className="h-9 px-3" onPress={pickPdf} />
        </View>
        {attachments.length > 0 ? (
          <Muted className="mt-1">{attachments.length} anexo(s) selecionado(s)</Muted>
        ) : null}
        <Pressable onPress={() => setDefer((v) => !v)} className="mt-2 flex-row items-center gap-2">
          <View className={`h-5 w-5 items-center justify-center rounded border border-input ${defer ? 'bg-primary' : ''}`}>
            {defer ? <Text className="text-[12px] text-primary-foreground">✓</Text> : null}
          </View>
          <Muted>Anexar comprovante depois</Muted>
        </Pressable>
      </View>
      <Button title="Salvar recebimento" onPress={save} disabled={saving} />
    </View>
  )
}
