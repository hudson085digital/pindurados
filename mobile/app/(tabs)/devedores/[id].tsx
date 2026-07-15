import { useState } from 'react'
import { View, Pressable, Alert, Linking } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { getCustomer, updateCustomer, removeCustomer } from '@/src/data/repositories/customers'
import {
  getSalesByCustomer,
  getChargeMessage,
  removeSale,
  updateSale,
} from '@/src/data/repositories/sales'
import { createReceipt, voidReceipt } from '@/src/data/repositories/receipts'
import { markLate, unmarkLate, updateDueDate } from '@/src/data/repositories/installments'
import { saveAttachment, attachmentUri } from '@/src/data/files'
import { shareCharge } from '@/src/lib/share'
import { toastSuccess, toastError } from '@/src/lib/toast'
import { formatCurrency, formatDate, formatPhone, brToISO, isoToBRDate } from '@/src/lib/format'
import { useColors } from '@/src/lib/theme'
import { todayISO } from '@/src/data/ids'
import type {
  Customer,
  DerivedSale,
  DerivedInstallment,
  ReceiptRow,
  ReceiptMethod,
} from '@/src/data/model'
import { Screen } from '@/src/components/ui/screen'
import { Card } from '@/src/components/ui/card'
import { Text, Muted } from '@/src/components/ui/text'
import { Button } from '@/src/components/ui/button'
import { Tag } from '@/src/components/ui/tag'
import { Skeleton } from '@/src/components/ui/skeleton'
import { Label } from '@/src/components/ui/field'
import { Input } from '@/src/components/ui/input'
import { CurrencyInput } from '@/src/components/ui/currency-input'
import { DateInput } from '@/src/components/ui/date-input'
import { EmptyState } from '@/src/components/ui/empty-state'
import { TextAction } from '@/src/components/ui/text-action'

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
    <Screen>
      <CustomerHeader
        customer={customer ?? null}
        balance={balance}
        onChanged={refresh}
        onDeleted={() => {
          qc.invalidateQueries({ queryKey: ['customers'] })
          qc.invalidateQueries({ queryKey: ['dashboard'] })
          router.back()
        }}
      />

      <Button
        title="Nova venda"
        icon="add"
        onPress={() => router.push(`/nova-venda?customerId=${id}`)}
      />

      {isLoading ? (
        <Card>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-16 w-full" />
        </Card>
      ) : sales && sales.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Nenhuma venda ainda"
          description="Registre a primeira venda fiado deste cliente."
        />
      ) : (
        sales?.map((sale) => <SaleCard key={sale.id} sale={sale} onChange={refresh} />)
      )}
    </Screen>
  )
}

function CustomerHeader({
  customer,
  balance,
  onChanged,
  onDeleted,
}: {
  customer: Customer | null
  balance: number
  onChanged: () => void
  onDeleted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  function openEditor() {
    setName(customer?.name ?? '')
    setPhone(customer?.phone ?? '')
    setNote(customer?.note ?? '')
    setEditing(true)
  }

  async function handleSave() {
    if (!name.trim()) return toastError('Informe o nome.')
    if (!customer) return
    setSaving(true)
    try {
      await updateCustomer(customer.id, {
        name: name.trim(),
        phone: phone || null,
        note: note || null,
      })
      toastSuccess('Devedor atualizado.')
      setEditing(false)
      onChanged()
    } catch {
      toastError('Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete() {
    if (!customer) return
    Alert.alert(
      'Excluir devedor',
      'Isso apaga o devedor e TODAS as vendas dele. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await removeCustomer(customer.id)
            toastSuccess('Devedor excluído.')
            onDeleted()
          },
        },
      ],
    )
  }

  if (editing) {
    return (
      <Card className="gap-3">
        <View>
          <Label>Nome *</Label>
          <Input value={name} onChangeText={setName} placeholder="Nome do devedor" />
        </View>
        <View>
          <Label>Contato</Label>
          <Input
            value={phone}
            onChangeText={(t) => setPhone(formatPhone(t))}
            keyboardType="phone-pad"
            placeholder="(00) 90000-0000"
          />
        </View>
        <View>
          <Label>Observação</Label>
          <Input value={note} onChangeText={setNote} placeholder="Opcional" />
        </View>
        <View className="flex-row gap-2">
          <Button
            title="Cancelar"
            variant="outline"
            className="flex-1"
            onPress={() => setEditing(false)}
          />
          <Button title="Salvar" className="flex-1" onPress={handleSave} loading={saving} />
        </View>
      </Card>
    )
  }

  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-lg font-semibold" numberOfLines={1}>
            {customer?.name ?? '…'}
          </Text>
          <Muted>{customer?.phone || 'sem contato'}</Muted>
        </View>
        <View className="items-end">
          <Muted className="text-[11px] uppercase tracking-wide">Saldo</Muted>
          <Text
            tnum
            className={`text-lg font-bold ${balance > 0 ? 'text-destructive' : 'text-primary'}`}
          >
            {formatCurrency(balance)}
          </Text>
        </View>
      </View>
      {customer?.note ? <Muted className="leading-5">{customer.note}</Muted> : null}
      <View className="flex-row items-center gap-4 border-t border-border pt-1">
        <TextAction label="Editar devedor" tone="primary" icon="create-outline" onPress={openEditor} />
        <TextAction label="Excluir devedor" tone="destructive" icon="trash-outline" onPress={handleDelete} />
      </View>
    </Card>
  )
}

function SaleCard({ sale, onChange }: { sale: DerivedSale; onChange: () => void }) {
  const c = useColors()
  const [showReceipt, setShowReceipt] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

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
            {sale.type === 'BY_TOTAL'
              ? 'Por valor final'
              : sale.type === 'AUTOMATIC'
                ? 'Automática'
                : 'Manual'}{' '}
            · {formatDate(sale.saleDate)}
          </Muted>
        </View>
        {sale.settled ? (
          <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1">
            <Ionicons name="checkmark-circle" size={13} color={c.primary} />
            <Text className="text-[11px] font-semibold uppercase text-primary">Quitada</Text>
          </View>
        ) : (
          <Text
            tnum
            className={`font-bold ${sale.balanceInCents > 0 ? 'text-destructive' : 'text-primary'}`}
          >
            {formatCurrency(sale.balanceInCents)}
          </Text>
        )}
      </View>

      <Muted className="leading-5">
        Produto {formatCurrency(sale.productValueInCents)} − entrada{' '}
        {formatCurrency(sale.downPaymentInCents)} + juros {sale.interestPercent}% ={' '}
        {formatCurrency(sale.totalInCents)} em {sale.installments.length}x
      </Muted>
      {sale.productCostInCents > 0 ? (
        <Muted>
          Custo {formatCurrency(sale.productCostInCents)} · lucro previsto{' '}
          <Text className="font-semibold text-primary">{formatCurrency(sale.profitInCents)}</Text>
        </Muted>
      ) : null}

      {!sale.settled ? (
        <View className="flex-row flex-wrap gap-2">
          <Button
            title="Cobrar"
            icon="logo-whatsapp"
            variant="outline"
            className="flex-1 px-3"
            onPress={handleCharge}
          />
          <Button
            title={showReceipt ? 'Fechar' : 'Receber'}
            icon={showReceipt ? 'close' : 'cash-outline'}
            className="flex-1 px-3"
            onPress={() => setShowReceipt((v) => !v)}
          />
        </View>
      ) : null}

      {showReceipt ? (
        <ReceiptForm
          sale={sale}
          onDone={() => {
            setShowReceipt(false)
            onChange()
          }}
        />
      ) : null}

      {showEdit ? (
        <SaleEditor
          sale={sale}
          onClose={() => setShowEdit(false)}
          onDone={() => {
            setShowEdit(false)
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

      <View className="flex-row items-center gap-4 border-t border-border pt-1">
        <TextAction
          label={showEdit ? 'Fechar edição' : 'Editar venda'}
          tone="primary"
          icon={showEdit ? 'close' : 'create-outline'}
          onPress={() => setShowEdit((v) => !v)}
        />
        <TextAction
          label="Excluir venda"
          tone="destructive"
          icon="trash-outline"
          onPress={handleDelete}
        />
      </View>
    </Card>
  )
}

function InstallmentRow({ inst, onChange }: { inst: DerivedInstallment; onChange: () => void }) {
  const statusLabel =
    inst.status === 'PAID' ? 'paga' : inst.status === 'PARTIAL' ? 'parcial' : 'em aberto'

  const [editingDue, setEditingDue] = useState(false)
  const [dueValue, setDueValue] = useState(() => isoToBRDate(inst.dueDate))
  const [savingDue, setSavingDue] = useState(false)

  const [lateOpen, setLateOpen] = useState(false)
  const [lateFee, setLateFee] = useState(String(inst.lateFeePercent ?? 25))
  const [reason, setReason] = useState('')
  const [markingLate, setMarkingLate] = useState(false)

  function openDueEditor() {
    setDueValue(isoToBRDate(inst.dueDate))
    setEditingDue(true)
  }

  async function handleSaveDue() {
    const iso = brToISO(dueValue)
    if (!iso) return toastError('Data inválida. Use dd/mm/aaaa.')
    setSavingDue(true)
    try {
      await updateDueDate(inst.id, iso)
      toastSuccess('Vencimento atualizado.')
      setEditingDue(false)
      onChange()
    } catch {
      toastError('Não foi possível atualizar o vencimento.')
    } finally {
      setSavingDue(false)
    }
  }

  function openLateEditor() {
    setLateFee(String(inst.lateFeePercent ?? 25))
    setReason('')
    setLateOpen(true)
  }

  async function handleMarkLate() {
    const fee = Number(lateFee.replace(',', '.'))
    if (!Number.isFinite(fee) || fee < 0) return toastError('Informe uma taxa válida.')
    setMarkingLate(true)
    try {
      await markLate(inst.id, { lateFeePercent: fee, reason: reason || null })
      toastSuccess('Atraso registrado.')
      setLateOpen(false)
      onChange()
    } catch {
      toastError('Não foi possível marcar o atraso.')
    } finally {
      setMarkingLate(false)
    }
  }

  function handleUnmark() {
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
  }

  return (
    <View className="rounded-md border border-border p-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="font-medium">Parcela {inst.number}</Text>
          <Muted>Vence {formatDate(inst.dueDate)}</Muted>
          <View className="mt-1 flex-row flex-wrap gap-1">
            <Tag tone={inst.status === 'PAID' ? 'green' : 'gray'}>{statusLabel}</Tag>
            {inst.overdue && inst.status !== 'PAID' ? <Tag tone="red">vencida</Tag> : null}
            {inst.isLate ? <Tag tone="red">+juros atraso</Tag> : null}
          </View>
          {inst.isLate && inst.lateReason ? (
            <Muted className="mt-1">Motivo: {inst.lateReason}</Muted>
          ) : null}
        </View>
        <View className="items-end">
          <Text tnum className="font-bold">
            {formatCurrency(inst.effectiveInCents)}
          </Text>
          {inst.isLate ? (
            <Muted className="text-destructive">
              orig. {formatCurrency(inst.amountInCents)} + {formatCurrency(inst.lateInterestInCents)}
            </Muted>
          ) : null}
          {inst.paidInCents > 0 && inst.balanceInCents > 0 ? (
            <Muted>falta {formatCurrency(inst.balanceInCents)}</Muted>
          ) : null}
        </View>
      </View>

      {editingDue ? (
        <View className="mt-2 gap-2">
          <Label>Novo vencimento</Label>
          <View className="flex-row gap-2">
            <DateInput value={dueValue} onChangeText={setDueValue} className="flex-1" />
            <Button title="Salvar" className="px-4" onPress={handleSaveDue} loading={savingDue} />
          </View>
          <TextAction label="Cancelar" onPress={() => setEditingDue(false)} />
        </View>
      ) : lateOpen ? (
        <View className="mt-2 gap-2">
          <View className="flex-row gap-3">
            <View className="w-28">
              <Label>Juros (%)</Label>
              <Input value={lateFee} onChangeText={setLateFee} keyboardType="number-pad" />
            </View>
            <View className="flex-1">
              <Label>Motivo (opcional)</Label>
              <Input value={reason} onChangeText={setReason} placeholder="Ex.: atraso de 30 dias" />
            </View>
          </View>
          <Muted>O juros incide sobre o saldo em aberto da parcela.</Muted>
          <View className="flex-row gap-2">
            <Button
              title="Cancelar"
              variant="outline"
              className="flex-1"
              onPress={() => setLateOpen(false)}
            />
            <Button
              title="Aplicar atraso"
              className="flex-1"
              onPress={handleMarkLate}
              loading={markingLate}
            />
          </View>
        </View>
      ) : (
        <View className="mt-1 flex-row items-center gap-4">
          <TextAction
            label="Editar vencimento"
            tone="primary"
            icon="calendar-outline"
            onPress={openDueEditor}
          />
          {inst.status !== 'PAID' ? (
            <TextAction
              label={inst.isLate ? 'Tirar atraso' : 'Marcar atraso'}
              tone={inst.isLate ? 'primary' : 'destructive'}
              icon={inst.isLate ? 'remove-circle-outline' : 'alarm-outline'}
              onPress={inst.isLate ? handleUnmark : openLateEditor}
            />
          ) : null}
        </View>
      )}
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
  const c = useColors()
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
    <View className="flex-row items-center justify-between border-t border-border/60 py-2">
      <View className="flex-1 flex-row items-start gap-1.5 pr-2">
        <Ionicons
          name={isReversal ? 'arrow-undo' : 'checkmark-circle'}
          size={15}
          color={isReversal ? c.mutedForeground : c.primary}
          style={{ marginTop: 1 }}
        />
        <View className="flex-1">
          <Text className={`text-[13px] ${isReversal ? 'text-muted-foreground' : ''}`}>
            {isReversal ? 'Estorno ' : ''}
            {formatCurrency(Math.abs(receipt.amountInCents))}
            {methods ? ` · ${methods}` : ''} · {formatDate(receipt.receivedAt)}
          </Text>
          {receipt.attachments.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => Linking.openURL(attachmentUri(a.path))}
              hitSlop={8}
              className="mt-0.5 flex-row items-center gap-1 py-1 active:opacity-60"
            >
              <Ionicons name="document-attach-outline" size={13} color={c.primary} />
              <Text className="text-[12px] text-primary">Ver comprovante</Text>
            </Pressable>
          ))}
          {!isReversal && receipt.attachments.length === 0 ? (
            <View className="mt-0.5 flex-row items-center gap-1">
              <Ionicons name="alert-circle" size={13} color={c.destructive} />
              <Text className="text-[12px] text-destructive">sem comprovante</Text>
            </View>
          ) : null}
          {receipt.note ? <Muted className="text-[12px]">{receipt.note}</Muted> : null}
        </View>
      </View>
      {!isReversal ? <TextAction label="Estornar" tone="destructive" onPress={handleVoid} /> : null}
    </View>
  )
}

function ReceiptForm({ sale, onDone }: { sale: DerivedSale; onDone: () => void }) {
  const c = useColors()
  const [amount, setAmount] = useState(0)
  const [methods, setMethods] = useState<ReceiptMethod[]>([])
  const [methodAmounts, setMethodAmounts] = useState<Partial<Record<ReceiptMethod, number>>>({})
  const [receivedAt, setReceivedAt] = useState(() => isoToBRDate(todayISO()))
  const [note, setNote] = useState('')
  const [attachments, setAttachments] = useState<{ path: string; mime: string | null }[]>([])
  const [defer, setDefer] = useState(false)
  const [saving, setSaving] = useState(false)

  const splitByMethod = methods.length >= 2
  const splitSum = methods.reduce((s, m) => s + (methodAmounts[m] ?? 0), 0)

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
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    })
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
    if (splitByMethod && splitSum !== amount) {
      return toastError('A soma dos valores por forma deve ser igual ao valor recebido.')
    }
    const iso = brToISO(receivedAt)
    if (!iso) return toastError('Data do recebimento inválida. Use dd/mm/aaaa.')
    setSaving(true)
    const result = await createReceipt({
      saleId: sale.id,
      amountInCents: amount,
      methods,
      methodAmountsInCents: splitByMethod ? methods.map((m) => methodAmounts[m] ?? 0) : undefined,
      receivedAt: iso,
      note: note || null,
      attachments: attachments.map((a) => ({ path: a.path, method: null, mime: a.mime })),
    })
    setSaving(false)
    if (!result.ok) return toastError(result.error)
    toastSuccess('Recebimento registrado!')
    onDone()
  }

  return (
    <View className="gap-3 rounded-md border border-border bg-background p-3">
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
      {splitByMethod ? (
        <View className="gap-2 rounded-md border border-border p-2">
          <Label>Quanto entrou em cada forma</Label>
          {methods.map((m) => (
            <View key={m} className="flex-row items-center gap-2">
              <Text className="w-24">{METHOD_LABEL[m]}</Text>
              <CurrencyInput
                className="flex-1"
                valueInCents={methodAmounts[m] ?? 0}
                onChangeCents={(v) => setMethodAmounts((prev) => ({ ...prev, [m]: v }))}
              />
            </View>
          ))}
          <View className="flex-row items-center justify-between">
            <Muted>Soma por forma</Muted>
            <Text tnum className={`font-semibold ${splitSum === amount ? '' : 'text-destructive'}`}>
              {formatCurrency(splitSum)} de {formatCurrency(amount)}
            </Text>
          </View>
        </View>
      ) : null}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Label>Data do recebimento</Label>
          <DateInput value={receivedAt} onChangeText={setReceivedAt} />
        </View>
      </View>

      <View>
        <Label>Observação</Label>
        <Input value={note} onChangeText={setNote} placeholder="Opcional" />
      </View>

      <View>
        <Label>Comprovante</Label>
        <View className="flex-row flex-wrap gap-2">
          <Button title="Câmera" icon="camera-outline" variant="outline" className="h-9 px-3" onPress={pickCamera} />
          <Button title="Galeria" icon="images-outline" variant="outline" className="h-9 px-3" onPress={pickGallery} />
          <Button title="PDF" icon="document-outline" variant="outline" className="h-9 px-3" onPress={pickPdf} />
        </View>
        {attachments.length > 0 ? (
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="checkmark-circle" size={14} color={c.primary} />
            <Muted>{attachments.length} anexo(s) selecionado(s)</Muted>
          </View>
        ) : null}
        <Pressable
          onPress={() => setDefer((v) => !v)}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: defer }}
          className="mt-2 flex-row items-center gap-2 py-1 active:opacity-70"
        >
          <View
            className={`h-5 w-5 items-center justify-center rounded border ${defer ? 'border-primary bg-primary' : 'border-input'}`}
          >
            {defer ? <Ionicons name="checkmark" size={14} color={c.primaryForeground} /> : null}
          </View>
          <Muted>Anexar comprovante depois</Muted>
        </Pressable>
      </View>
      <Button title="Salvar recebimento" icon="checkmark" onPress={save} loading={saving} />
    </View>
  )
}

type ParcelDraft = { value: number; date: string }

function SaleEditor({
  sale,
  onClose,
  onDone,
}: {
  sale: DerivedSale
  onClose: () => void
  onDone: () => void
}) {
  const c = useColors()
  const [desc, setDesc] = useState(sale.description ?? '')
  const [cost, setCost] = useState(sale.productCostInCents)
  const [date, setDate] = useState(() => isoToBRDate(sale.saleDate))
  const [reparcel, setReparcel] = useState(false)
  const [total, setTotal] = useState(sale.totalInCents)
  const [parcels, setParcels] = useState<ParcelDraft[]>(() =>
    sale.installments.map((i) => ({ value: i.amountInCents, date: isoToBRDate(i.dueDate) })),
  )
  const [saving, setSaving] = useState(false)

  function setParcelCount(n: number) {
    const count = Math.max(1, n)
    setParcels((prev) => {
      if (count === prev.length) return prev
      if (count < prev.length) return prev.slice(0, count)
      const last = prev[prev.length - 1]
      const extra = Array.from({ length: count - prev.length }, () => ({
        value: 0,
        date: last?.date ?? date,
      }))
      return [...prev, ...extra]
    })
  }

  function setParcel(i: number, patch: Partial<ParcelDraft>) {
    setParcels((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }

  // A última parcela completa o total (total − soma das demais), nunca negativa.
  function computedValues(): number[] {
    if (!parcels.length) return []
    const others = parcels.slice(0, -1).reduce((s, p) => s + p.value, 0)
    return parcels.map((p, i) =>
      i === parcels.length - 1 ? Math.max(0, total - others) : p.value,
    )
  }

  const values = computedValues()
  const sum = values.reduce((s, v) => s + v, 0)

  async function handleSave() {
    const saleISO = brToISO(date)
    if (!saleISO) return toastError('Data da venda inválida. Use dd/mm/aaaa.')

    let reparcelPayload: { totalInCents: number; installmentValuesInCents: number[]; dueDatesISO: string[] } | undefined
    if (reparcel) {
      if (total <= 0) return toastError('Informe o total da venda.')
      const dueDatesISO: string[] = []
      for (const p of parcels) {
        const iso = brToISO(p.date)
        if (!iso) return toastError('Há uma data de parcela inválida (dd/mm/aaaa).')
        dueDatesISO.push(iso)
      }
      reparcelPayload = {
        totalInCents: total,
        installmentValuesInCents: values,
        dueDatesISO,
      }
    }

    setSaving(true)
    try {
      await updateSale(sale.id, {
        description: desc || null,
        productCostInCents: cost,
        saleDate: saleISO,
        reparcel: reparcelPayload,
      })
      toastSuccess('Venda atualizada.')
      onDone()
    } catch {
      toastError('Não foi possível salvar (verifique os valores).')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className="gap-3 rounded-md border border-primary/30 bg-background p-3">
      <Text className="font-semibold text-primary">Editar venda</Text>

      <View>
        <Label>Descrição</Label>
        <Input value={desc} onChangeText={setDesc} placeholder="Ex.: Geladeira" />
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Label>Custo (p/ lucro)</Label>
          <CurrencyInput valueInCents={cost} onChangeCents={setCost} />
        </View>
        <View className="flex-1">
          <Label>Data da venda</Label>
          <DateInput value={date} onChangeText={setDate} />
        </View>
      </View>

      <Pressable
        onPress={() => setReparcel((v) => !v)}
        hitSlop={8}
        accessibilityRole="switch"
        accessibilityState={{ checked: reparcel }}
        className="flex-row items-center justify-between rounded-md border border-border p-3 active:opacity-70"
      >
        <View className="flex-1 pr-2">
          <Text className="font-medium">Reparcelar</Text>
          <Muted>Redefinir o valor e a data de cada parcela.</Muted>
        </View>
        <View
          className={`h-6 w-6 items-center justify-center rounded-full border ${reparcel ? 'border-primary bg-primary' : 'border-input'}`}
        >
          {reparcel ? <Ionicons name="checkmark" size={15} color={c.primaryForeground} /> : null}
        </View>
      </Pressable>

      {reparcel ? (
        <View className="gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Label>Total da venda</Label>
              <CurrencyInput valueInCents={total} onChangeCents={setTotal} />
            </View>
            <View className="w-32">
              <Label>Nº de parcelas</Label>
              <View className="h-12 flex-row items-center justify-between rounded-md border border-input bg-card px-2">
                <Pressable
                  onPress={() => setParcelCount(parcels.length - 1)}
                  hitSlop={8}
                  className="h-9 w-9 items-center justify-center active:opacity-60"
                  accessibilityRole="button"
                  accessibilityLabel="Menos uma parcela"
                >
                  <Ionicons name="remove" size={18} color={c.foreground} />
                </Pressable>
                <Text tnum className="text-base font-semibold">
                  {parcels.length}
                </Text>
                <Pressable
                  onPress={() => setParcelCount(parcels.length + 1)}
                  hitSlop={8}
                  className="h-9 w-9 items-center justify-center active:opacity-60"
                  accessibilityRole="button"
                  accessibilityLabel="Mais uma parcela"
                >
                  <Ionicons name="add" size={18} color={c.foreground} />
                </Pressable>
              </View>
            </View>
          </View>

          {parcels.map((p, i) => {
            const isLast = i === parcels.length - 1
            return (
              <View key={i} className="rounded-md border border-border p-3">
                <View className="mb-1 flex-row items-center justify-between">
                  <Text className="font-medium">Parcela {i + 1}</Text>
                  {isLast ? <Muted>valor automático</Muted> : null}
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Label>Valor</Label>
                    {isLast ? (
                      <View className="h-12 justify-center rounded-md border border-input bg-muted px-3">
                        <Text tnum className="text-base">
                          {formatCurrency(values[i] ?? 0)}
                        </Text>
                      </View>
                    ) : (
                      <CurrencyInput
                        valueInCents={p.value}
                        onChangeCents={(v) => setParcel(i, { value: v })}
                      />
                    )}
                  </View>
                  <View className="flex-1">
                    <Label>Vencimento</Label>
                    <DateInput value={p.date} onChangeText={(d) => setParcel(i, { date: d })} />
                  </View>
                </View>
              </View>
            )
          })}

          <View className="flex-row items-center justify-between">
            <Muted>Soma das parcelas</Muted>
            <Text
              tnum
              className={`font-semibold ${sum === total ? '' : 'text-destructive'}`}
            >
              {formatCurrency(sum)} de {formatCurrency(total)}
            </Text>
          </View>
        </View>
      ) : null}

      <View className="flex-row gap-2">
        <Button title="Cancelar" variant="outline" className="flex-1" onPress={onClose} />
        <Button title="Salvar venda" className="flex-1" onPress={handleSave} loading={saving} />
      </View>
    </View>
  )
}
