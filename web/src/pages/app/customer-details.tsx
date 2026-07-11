import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, Undo2, Send, Bell, Pencil, Link2, Copy, Trash2, Receipt as ReceiptIcon, Check, AlertTriangle, Plus, Camera } from 'lucide-react'
import { getCustomerDetails, deleteCustomer, updateCustomer } from '@/api/customers'
import { addSaleAttachments, addSaleItem, deleteSale, deleteSaleAttachment, getChargeMessage, updateSale } from '@/api/sales'
import {
  createShareLink,
  getShareLink,
  revokeShareLink,
  buildPublicUrl,
} from '@/api/share-links'
import { createReceipt, updateReceipt, voidReceipt, AttachmentUpload } from '@/api/receipts'
import {
  markInstallmentLate,
  unmarkInstallmentLate,
  updateInstallmentDueDate,
} from '@/api/installments'
import { Installment, Receipt, ReceiptMethod, Sale } from '@/api/types'
import { ALL_RECEIPT_METHODS, RECEIPT_METHOD_LABELS } from '@pindurados/core'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { fetchStockUnits } from '@/api/stock'
import { queryClient } from '@/lib/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { DatePicker } from '@/components/ui/date-picker'

export function CustomerDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const confirm = useConfirm()

  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomerDetails(id!),
    enabled: !!id,
  })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['customer', id] })
    queryClient.invalidateQueries({ queryKey: ['customers'] })
    queryClient.invalidateQueries({ queryKey: ['summary'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const { mutateAsync: removeCustomer } = useMutation({ mutationFn: deleteCustomer })
  const { mutateAsync: saveCustomer } = useMutation({
    mutationFn: (autoReminder: boolean) => updateCustomer(id!, { autoReminder }),
  })

  async function handleDeleteCustomer() {
    const ok = await confirm({
      title: 'Excluir cliente?',
      description: 'Todas as vendas dele também serão excluídas. Essa ação não tem volta.',
      confirmLabel: 'Excluir',
      destructive: true,
    })
    if (!ok) return
    await removeCustomer(id!)
    navigate('/clientes')
  }

  async function handleToggleReminder(next: boolean) {
    await saveCustomer(next)
    toast.success(next ? 'Lembrete automático ativado.' : 'Lembrete automático desativado.')
    refresh()
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-16" />
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const { customer, sales, balanceInCents } = data

  return (
    <div className="space-y-3">
      <Link
        to="/clientes"
        className="-ml-2 inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ChevronLeft className="h-4 w-4" /> Clientes
      </Link>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{customer.name}</p>
              <p className="text-sm text-muted-foreground">
                {customer.phone || 'sem contato'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={cn(
                  'text-lg font-bold tabular-nums',
                  balanceInCents > 0 ? 'text-destructive' : 'text-success',
                )}
              >
                {formatCurrency(balanceInCents)}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {balanceInCents > 0 ? 'saldo devedor' : 'em dia'}
              </p>
            </div>
          </div>
          {customer.note && (
            <p className="mt-2 text-sm text-muted-foreground">{customer.note}</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
            <label
              htmlFor="auto-reminder"
              className={cn(
                'flex items-center gap-2 text-sm',
                customer.autoReminder ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <Bell className={cn('h-4 w-4', customer.autoReminder && 'text-primary')} />
              Lembrete automático de cobrança
            </label>
            <Switch
              id="auto-reminder"
              checked={customer.autoReminder}
              onCheckedChange={handleToggleReminder}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button asChild size="sm" className="flex-1">
          <Link to={`/nova-venda?customerId=${customer.id}`}>
            <Plus className="h-4 w-4" /> Nova venda
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDeleteCustomer}>
          <Trash2 className="h-4 w-4" /> Excluir
        </Button>
      </div>

      <p className="pt-2 font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Vendas
      </p>

      {sales.length === 0 && (
        <EmptyState
          icon={ReceiptIcon}
          title="Nenhuma venda ainda"
          description="Registre a primeira venda fiado deste cliente para acompanhar parcelas e recebimentos."
          action={
            <Button asChild className="w-full">
              <Link to={`/nova-venda?customerId=${customer.id}`}>
                <Plus className="h-4 w-4" /> Nova venda
              </Link>
            </Button>
          }
        />
      )}

      {sales.map((sale) => (
        <SaleCard key={sale.id} sale={sale} onChange={refresh} />
      ))}
    </div>
  )
}

// Rótulos/ordem vêm da fonte única do core — ampliar formas = editar lá.
const METHOD_LABEL = RECEIPT_METHOD_LABELS
const ALL_METHODS: ReceiptMethod[] = ALL_RECEIPT_METHODS

function methodsLabel(methods: ReceiptMethod[], amounts: number[] = []): string {
  if (!methods.length) return 'sem forma'
  // Com valor por forma (2+ formas), mostra "Pix R$600 + Dinheiro R$400".
  if (amounts.length === methods.length) {
    return methods.map((m, i) => `${METHOD_LABEL[m]} ${formatCurrency(amounts[i])}`).join(' + ')
  }
  return methods.map((m) => METHOD_LABEL[m]).join(' + ')
}

function toggleMethod(list: ReceiptMethod[], m: ReceiptMethod): ReceiptMethod[] {
  return list.includes(m) ? list.filter((x) => x !== m) : [...list, m]
}

// Linha de comprovante no formulário: arquivo + forma (opcional).
type AttachRow = { file: File | null; method: ReceiptMethod | '' }

function attachUploads(rows: AttachRow[]): AttachmentUpload[] {
  return rows
    .filter((r) => r.file)
    .map((r) => ({ file: r.file as File, method: r.method || null }))
}

function SaleCard({ sale, onChange }: { sale: Sale; onChange: () => void }) {
  const confirm = useConfirm()
  const { mutateAsync: removeSale } = useMutation({ mutationFn: deleteSale })
  const { mutateAsync: charge, isPending: charging } = useMutation({
    mutationFn: () => getChargeMessage(sale.id),
  })

  const [editOpen, setEditOpen] = useState(false)
  const [editDesc, setEditDesc] = useState(sale.description ?? '')
  const [editCost, setEditCost] = useState(sale.productCostInCents)
  const [editDate, setEditDate] = useState(sale.saleDate.slice(0, 10))
  // Reparcelamento (opcional): você define o total da venda e o valor de cada
  // parcela; a ÚLTIMA é calculada automaticamente para a soma bater com o total.
  const [reparcelar, setReparcelar] = useState(false)
  const [editTotal, setEditTotal] = useState(sale.totalInCents)
  const [parcels, setParcels] = useState<{ value: number; date: string }[]>([])

  function seedParcels() {
    setParcels(
      sale.installments.map((i) => ({ value: i.amountInCents, date: i.dueDate.slice(0, 10) })),
    )
  }

  function setParcelCount(n: number) {
    setParcels((prev) => {
      const count = Math.max(1, n)
      if (count === prev.length) return prev
      if (count < prev.length) return prev.slice(0, count)
      const last = prev[prev.length - 1]
      const extra = Array.from({ length: count - prev.length }, () => ({ value: 0, date: last?.date ?? '' }))
      return [...prev, ...extra]
    })
  }

  // Valores finais: a última parcela = total − soma das demais (mínimo 0).
  function computedParcelValues(): number[] {
    if (!parcels.length) return []
    const others = parcels.slice(0, -1).reduce((s, p) => s + p.value, 0)
    return parcels.map((p, i) => (i === parcels.length - 1 ? Math.max(0, editTotal - others) : p.value))
  }

  const { mutateAsync: saveSale, isPending: saving } = useMutation({
    mutationFn: () =>
      updateSale(sale.id, {
        description: editDesc || null,
        productCostInCents: editCost,
        saleDate: editDate,
        ...(reparcelar
          ? {
              type: 'MANUAL',
              productValueInCents: editTotal,
              targetTotalInCents: editTotal,
              customInstallmentValuesInCents: computedParcelValues(),
              dueDatesISO: parcels.map((p) => p.date),
            }
          : {}),
      }),
  })

  const computedValues = computedParcelValues()
  const parcelsSum = computedValues.reduce((s, v) => s + v, 0)

  async function handleDelete() {
    const ok = await confirm({
      title: 'Excluir esta venda?',
      description: 'Parcelas e recebimentos dela também somem. Essa ação não tem volta.',
      confirmLabel: 'Excluir venda',
      destructive: true,
    })
    if (!ok) return
    await removeSale(sale.id)
    onChange()
  }

  async function handleSaveSale() {
    await saveSale()
    toast.success('Venda atualizada.')
    setEditOpen(false)
    onChange()
  }

  async function handleCharge() {
    try {
      const { message, whatsappUrl } = await charge()
      if (whatsappUrl) {
        window.open(whatsappUrl, '_blank')
      } else {
        await navigator.clipboard.writeText(message)
        toast.success('Sem telefone — mensagem copiada para você colar.')
      }
    } catch {
      toast.error('Não foi possível gerar a cobrança.')
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold">{sale.description || 'Venda'}</p>
            <p className="text-sm text-muted-foreground">
              {sale.saleKind ?? (sale.type === 'BY_TOTAL' ? 'Por valor final' : sale.type === 'AUTOMATIC' ? 'Automática' : 'Promissória')}
              {sale.customerKind ? ` · ${sale.customerKind}` : ''}
              {' · '}{formatDate(sale.saleDate)}
              {sale.origin ? ` · ${sale.origin}` : ''}
              {sale.deliveryType ? ` · ${sale.deliveryType}` : ''}
            </p>
          </div>
          {sale.settled ? (
            <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-success">
              Quitada
            </span>
          ) : (
            <span
              className={cn(
                'shrink-0 font-bold tabular-nums',
                sale.balanceInCents > 0 ? 'text-destructive' : 'text-success',
              )}
            >
              {formatCurrency(sale.balanceInCents)}
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Produto {formatCurrency(sale.productValueInCents)} − entrada{' '}
          {formatCurrency(sale.downPaymentInCents)} + juros {sale.interestPercent}% ={' '}
          <strong>{formatCurrency(sale.totalInCents)}</strong> em{' '}
          {sale.installments.length}x
        </p>

        {sale.productCostInCents > 0 && (
          <p className="text-sm">
            Custo {formatCurrency(sale.productCostInCents)} ·{' '}
            <span
              className={cn(
                'font-semibold',
                sale.profitInCents >= 0 ? 'text-success' : 'text-destructive',
              )}
            >
              {sale.profitInCents >= 0 ? 'lucro' : 'prejuízo'} {formatCurrency(sale.profitInCents)}
            </span>
            {sale.marginPercent != null && (
              <span className="text-muted-foreground">
                {' · '}margem {sale.marginPercent.toLocaleString('pt-BR')}%
                {sale.markupPercent != null &&
                  ` · mark-up ${sale.markupPercent.toLocaleString('pt-BR')}%`}
              </span>
            )}
          </p>
        )}

        {(sale.items?.length ?? 0) > 0 && (
          <div className="rounded-md bg-secondary/40 p-3">
            <p className="mb-1 font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Itens
            </p>
            <ul className="divide-y divide-border/60">
              {sale.items!.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 py-1.5 text-sm first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.nameSnapshot}</p>
                    {item.warrantyUntil && (
                      <p className="text-xs text-muted-foreground">
                        garantia até {formatDate(item.warrantyUntil)}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatCurrency(item.priceInCents - item.discountInCents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!sale.settled && (
            <Button size="sm" variant="outline" onClick={handleCharge} disabled={charging}>
              <Send className="mr-1 h-4 w-4" /> Cobrar
            </Button>
          )}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditDesc(sale.description ?? '')
                setEditCost(sale.productCostInCents)
                setEditDate(sale.saleDate.slice(0, 10))
                setReparcelar(false)
                setEditTotal(sale.totalInCents)
                seedParcels()
                setEditOpen(true)
              }}
            >
              <Pencil className="mr-1 h-4 w-4" /> Editar
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar venda</DialogTitle>
              </DialogHeader>
              <div>
                <Label htmlFor="edit-sale-desc">Descrição</Label>
                <Input id="edit-sale-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-sale-cost">Custo do produto (R$)</Label>
                <CurrencyInput id="edit-sale-cost" valueInCents={editCost} onChangeCents={setEditCost} />
              </div>
              <div>
                <Label htmlFor="edit-sale-date">Data da venda</Label>
                <DatePicker id="edit-sale-date" value={editDate} onChange={setEditDate} />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
                <label
                  htmlFor="edit-sale-reparcelar"
                  className={cn('text-sm', reparcelar ? 'text-foreground' : 'text-muted-foreground')}
                >
                  Reparcelar (valor e data de cada parcela)
                </label>
                <Switch
                  id="edit-sale-reparcelar"
                  checked={reparcelar}
                  onCheckedChange={setReparcelar}
                />
              </div>

              {reparcelar && (
                <div className="space-y-3 rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Você define o valor das parcelas; a última completa o total
                    automaticamente. O que já foi recebido é mantido.
                  </p>
                  <div>
                    <Label htmlFor="reparcel-total">Valor da venda (total)</Label>
                    <CurrencyInput id="reparcel-total" valueInCents={editTotal} onChangeCents={setEditTotal} />
                  </div>
                  <div>
                    <Label htmlFor="reparcel-count">Nº de parcelas</Label>
                    <Input
                      id="reparcel-count"
                      type="number"
                      min={1}
                      value={parcels.length}
                      onChange={(e) => setParcelCount(Number(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    {parcels.map((p, i) => {
                      const isLast = i === parcels.length - 1
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-8 shrink-0 text-sm text-muted-foreground">{i + 1}ª</span>
                          <CurrencyInput
                            valueInCents={isLast ? computedValues[i] : p.value}
                            onChangeCents={(c) =>
                              setParcels((prev) => prev.map((x, j) => (j === i ? { ...x, value: c } : x)))
                            }
                            disabled={isLast && parcels.length > 1}
                          />
                          <DatePicker
                            aria-label={`Vencimento da ${i + 1}ª parcela`}
                            className="w-44"
                            value={p.date}
                            onChange={(value) =>
                              setParcels((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, date: value } : x)),
                              )
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                  <p className={cn('text-sm', parcelsSum !== editTotal && 'text-destructive')}>
                    Soma das parcelas: <strong>{formatCurrency(parcelsSum)}</strong> de{' '}
                    {formatCurrency(editTotal)}
                  </p>
                </div>
              )}

              <Button className="w-full" onClick={handleSaveSale} loading={saving}>
                Salvar alterações
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {sale.installments.map((inst) => (
            <InstallmentRow key={inst.id} inst={inst} onChange={onChange} />
          ))}
        </div>

        {(sale.items?.length ?? 0) === 0 && (
          <LinkProductBanner sale={sale} onChange={onChange} />
        )}

        <SalePhotosSection sale={sale} onChange={onChange} />

        <ReceiptsSection sale={sale} onChange={onChange} />

        <ShareLinkSection saleId={sale.id} />

        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" /> Excluir venda
        </Button>
      </CardContent>
    </Card>
  )
}

function ShareLinkSection({ saleId }: { saleId: string }) {
  const confirm = useConfirm()
  const { data: state, isLoading } = useQuery({
    queryKey: ['share-link', saleId],
    queryFn: () => getShareLink(saleId),
  })

  const { mutateAsync: generate, isPending: generating } = useMutation({
    mutationFn: () => createShareLink(saleId),
  })
  const { mutateAsync: revoke, isPending: revoking } = useMutation({
    mutationFn: () => revokeShareLink(saleId),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['share-link', saleId] })
  }

  const isActive = state?.exists && state.status === 'active' && state.token
  const publicUrl = isActive ? buildPublicUrl(state.token!) : null

  async function handleGenerate() {
    try {
      const { token } = await generate()
      await navigator.clipboard.writeText(buildPublicUrl(token)).catch(() => {})
      toast.success('Link gerado e copiado!')
      invalidate()
    } catch {
      toast.error('Não foi possível gerar o link.')
    }
  }

  async function handleCopy() {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    toast.success('Link copiado!')
  }

  async function handleRevoke() {
    const ok = await confirm({
      title: 'Revogar o link público?',
      description: 'Quem tiver o endereço deixará de ver a venda.',
      confirmLabel: 'Revogar',
      destructive: true,
    })
    if (!ok) return
    try {
      await revoke()
      toast.success('Link revogado.')
      invalidate()
    } catch {
      toast.error('Não foi possível revogar.')
    }
  }

  return (
    <div className="rounded-md bg-secondary/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1 font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" /> Link público
        </p>
        {state && !isActive && (
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {state.exists ? 'Gerar novo link' : 'Gerar link'}
          </Button>
        )}
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}

      {state && !state.exists && (
        <p className="text-xs text-muted-foreground">
          Gere um link para o cliente acompanhar esta venda sem login.
        </p>
      )}

      {state?.exists && !isActive && (
        <p className="text-xs text-muted-foreground">
          Link {state.status === 'revoked' ? 'revogado' : 'expirado'}. Gere um novo para
          compartilhar.
        </p>
      )}

      {isActive && publicUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md border bg-card p-2">
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{publicUrl}</span>
            <Button size="sm" variant="outline" onClick={handleCopy}>
              <Copy className="mr-1 h-4 w-4" /> Copiar
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
              Gerar novo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={handleRevoke}
              disabled={revoking}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Revogar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ReceiptsSection({ sale, onChange }: { sale: Sale; onChange: () => void }) {
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [amountCents, setAmountCents] = useState(0)
  const [methods, setMethods] = useState<ReceiptMethod[]>([])
  const [methodAmounts, setMethodAmounts] = useState<Record<string, number>>({})
  const [receivedAt, setReceivedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [attachRows, setAttachRows] = useState<AttachRow[]>([{ file: null, method: '' }])
  const [deferProof, setDeferProof] = useState(false)

  const { mutateAsync: create, isPending } = useMutation({ mutationFn: createReceipt })
  const { mutateAsync: revert } = useMutation({ mutationFn: voidReceipt })
  const { mutateAsync: edit, isPending: editing } = useMutation({ mutationFn: updateReceipt })

  // Edição de um recebimento existente
  const [editId, setEditId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState(0)
  const [editMethods, setEditMethods] = useState<ReceiptMethod[]>([])
  const [editMethodAmounts, setEditMethodAmounts] = useState<Record<string, number>>({})
  const [editDate, setEditDate] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editAttachRows, setEditAttachRows] = useState<AttachRow[]>([])

  function openEdit(r: Receipt) {
    setEditId(r.id)
    setEditAmount(r.amountInCents)
    setEditMethods(r.methods)
    const amts: Record<string, number> = {}
    r.methods.forEach((m, i) => (amts[m] = r.methodAmountsInCents[i] ?? 0))
    setEditMethodAmounts(amts)
    setEditDate(r.receivedAt.slice(0, 10))
    setEditNote(r.note ?? '')
    setEditAttachRows([])
  }

  async function handleEdit() {
    if (!editId) return
    if (!editAmount) return toast.error('Informe um valor.')
    let methodAmountsInCents: number[] | undefined
    if (editMethods.length >= 2) {
      methodAmountsInCents = editMethods.map((m) => editMethodAmounts[m] ?? 0)
      if (methodAmountsInCents.reduce((s, a) => s + a, 0) !== editAmount) {
        return toast.error('A soma dos valores por forma deve ser igual ao valor recebido.')
      }
    }
    try {
      await edit({
        saleId: sale.id,
        receiptId: editId,
        amountInCents: editAmount,
        methods: editMethods,
        methodAmountsInCents,
        receivedAt: editDate,
        note: editNote,
        addAttachments: attachUploads(editAttachRows),
      })
      toast.success('Recebimento atualizado.')
      setEditId(null)
      onChange()
    } catch {
      toast.error('Não foi possível editar (verifique o valor x saldo).')
    }
  }

  // Recebimentos positivos que já foram estornados (têm um estorno apontando p/ eles).
  const reversedIds = new Set(
    sale.receipts.filter((r) => r.reversesReceiptId).map((r) => r.reversesReceiptId!),
  )

  async function handleCreate() {
    if (!amountCents) return toast.error('Informe um valor.')
    const uploads = attachUploads(attachRows)
    if (!uploads.length && !deferProof) {
      return toast.error('Anexe o comprovante ou marque "anexar depois".')
    }
    if (amountCents > sale.balanceInCents) {
      return toast.error(
        `Valor acima do saldo. Receba no máximo ${formatCurrency(sale.balanceInCents)}.`,
      )
    }
    let methodAmountsInCents: number[] | undefined
    if (methods.length >= 2) {
      methodAmountsInCents = methods.map((m) => methodAmounts[m] ?? 0)
      if (methodAmountsInCents.reduce((s, a) => s + a, 0) !== amountCents) {
        return toast.error('A soma dos valores por forma deve ser igual ao valor recebido.')
      }
    }
    try {
      await create({ saleId: sale.id, amountInCents: amountCents, methods, methodAmountsInCents, attachments: uploads, receivedAt, note })
      toast.success('Recebimento registrado!')
      setOpen(false)
      setAmountCents(0)
      setMethods([])
      setMethodAmounts({})
      setNote('')
      setAttachRows([{ file: null, method: '' }])
      setDeferProof(false)
      onChange()
    } catch {
      toast.error('Erro ao registrar recebimento.')
    }
  }

  async function handleVoid(receipt: Receipt) {
    const ok = await confirm({
      title: `Estornar ${formatCurrency(receipt.amountInCents)}?`,
      description: 'O valor volta ao saldo devedor. O registro original fica no histórico.',
      confirmLabel: 'Estornar',
      destructive: true,
    })
    if (!ok) return
    try {
      await revert({ saleId: sale.id, receiptId: receipt.id })
      toast.success('Recebimento estornado.')
      onChange()
    } catch {
      toast.error('Erro ao estornar.')
    }
  }

  return (
    <div className="rounded-md bg-secondary/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Recebimentos
        </p>
        {!sale.settled && (
          <Dialog open={open} onOpenChange={setOpen}>
            <Button size="sm" onClick={() => setOpen(true)}>
              Registrar recebimento
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar recebimento</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Abate das parcelas mais antigas primeiro. Saldo:{' '}
                <strong>{formatCurrency(sale.balanceInCents)}</strong>.
              </p>
              <div>
                <Label htmlFor="receipt-amount">Valor recebido (R$) *</Label>
                <CurrencyInput
                  id="receipt-amount"
                  valueInCents={amountCents}
                  onChangeCents={setAmountCents}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Forma(s) de pagamento (opcional)</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {ALL_METHODS.map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={methods.includes(m) ? 'default' : 'outline'}
                      onClick={() => setMethods((prev) => toggleMethod(prev, m))}
                    >
                      {METHOD_LABEL[m]}
                    </Button>
                  ))}
                </div>
              </div>
              <MethodAmountFields
                methods={methods}
                amounts={methodAmounts}
                setAmounts={setMethodAmounts}
                total={amountCents}
              />
              <div>
                <Label htmlFor="receipt-date">Data</Label>
                <DatePicker id="receipt-date" value={receivedAt} onChange={setReceivedAt} />
              </div>
              <div>
                <Label>Comprovantes (foto/PDF)</Label>
                <AttachmentRows rows={attachRows} setRows={setAttachRows} allowEmpty />
                <label className="mt-2 flex min-h-[36px] cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0"
                    checked={deferProof}
                    onChange={(e) => setDeferProof(e.target.checked)}
                  />
                  Anexar comprovante depois (ficará em alerta até anexar)
                </label>
              </div>
              <div>
                <Label htmlFor="receipt-note">Observação</Label>
                <Textarea
                  id="receipt-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <Button className="w-full" onClick={handleCreate} loading={isPending}>
                Salvar recebimento
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {sale.receipts.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum recebimento ainda.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {sale.receipts.map((r) => {
            const isReversal = r.amountInCents < 0
            const alreadyReversed = reversedIds.has(r.id)
            const pendingProof =
              !isReversal && !alreadyReversed && !r.receiptPath && r.attachments.length === 0
            return (
              <li key={r.id} className="flex items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <div className={cn('flex min-w-0 items-start gap-1.5 text-xs', isReversal && 'text-muted-foreground')}>
                  {isReversal ? (
                    <Undo2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-label="estorno" />
                  ) : (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-label="recebido" />
                  )}
                  <span className="min-w-0">
                    {isReversal && 'Estorno '}
                    <strong className="tabular-nums">{formatCurrency(Math.abs(r.amountInCents))}</strong> ·{' '}
                    {methodsLabel(r.methods, r.methodAmountsInCents)} · {formatDate(r.receivedAt)}
                    {r.note && !isReversal && ` · ${r.note}`}
                    {r.attachments.map((a, i) => (
                      <span key={a.id}>
                        {' · '}
                        <a
                          className="font-medium text-primary underline-offset-2 hover:underline"
                          href={`${import.meta.env.VITE_API_URL}/comprovantes/${a.path}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {a.method ? METHOD_LABEL[a.method] : `comprovante ${i + 1}`}
                        </a>
                      </span>
                    ))}
                    {r.receiptPath && r.attachments.length === 0 && (
                      <>
                        {' · '}
                        <a
                          className="font-medium text-primary underline-offset-2 hover:underline"
                          href={`${import.meta.env.VITE_API_URL}/comprovantes/${r.receiptPath}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          comprovante
                        </a>
                      </>
                    )}
                    {pendingProof && (
                      <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">
                        <AlertTriangle className="h-3 w-3" /> sem comprovante
                      </span>
                    )}
                  </span>
                </div>
                {!isReversal && !alreadyReversed && (
                  <span className="-my-1 flex shrink-0 items-center">
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      aria-label={`Editar recebimento de ${formatCurrency(r.amountInCents)}`}
                      title="Editar"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      aria-label={`Estornar recebimento de ${formatCurrency(r.amountInCents)}`}
                      title="Estornar"
                      onClick={() => handleVoid(r)}
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Diálogo de edição de recebimento */}
      <Dialog open={editId !== null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar recebimento</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="edit-receipt-amount">Valor (R$)</Label>
            <CurrencyInput id="edit-receipt-amount" valueInCents={editAmount} onChangeCents={setEditAmount} />
          </div>
          <div>
            <Label>Forma(s) de pagamento (opcional)</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {ALL_METHODS.map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={editMethods.includes(m) ? 'default' : 'outline'}
                  onClick={() => setEditMethods((prev) => toggleMethod(prev, m))}
                >
                  {METHOD_LABEL[m]}
                </Button>
              ))}
            </div>
          </div>
          <MethodAmountFields
            methods={editMethods}
            amounts={editMethodAmounts}
            setAmounts={setEditMethodAmounts}
            total={editAmount}
          />
          <div>
            <Label htmlFor="edit-receipt-date">Data</Label>
            <DatePicker id="edit-receipt-date" value={editDate} onChange={setEditDate} />
          </div>
          <div>
            <Label>Adicionar comprovantes (opcional)</Label>
            <AttachmentRows rows={editAttachRows} setRows={setEditAttachRows} allowEmpty />
            <p className="mt-1 text-xs text-muted-foreground">
              Mantém os comprovantes atuais e anexa os novos.
            </p>
          </div>
          <div>
            <Label htmlFor="edit-receipt-note">Observação</Label>
            <Textarea id="edit-receipt-note" rows={2} value={editNote} onChange={(e) => setEditNote(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleEdit} loading={editing}>
            Salvar alterações
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InstallmentRow({ inst, onChange }: { inst: Installment; onChange: () => void }) {
  const confirm = useConfirm()
  const [lateOpen, setLateOpen] = useState(false)
  const [lateFee, setLateFee] = useState('25')
  const [reason, setReason] = useState('')
  const [editingDue, setEditingDue] = useState(false)
  const [dueValue, setDueValue] = useState(() => inst.dueDate.slice(0, 10))

  const { mutateAsync: markLate } = useMutation({ mutationFn: markInstallmentLate })
  const { mutateAsync: unmarkLate } = useMutation({ mutationFn: unmarkInstallmentLate })
  const { mutateAsync: saveDueDate } = useMutation({
    mutationFn: (dueDate: string) => updateInstallmentDueDate(inst.id, dueDate),
  })

  async function handleSaveDue() {
    await saveDueDate(dueValue)
    toast.success('Vencimento atualizado.')
    setEditingDue(false)
    onChange()
  }

  async function handleMarkLate() {
    await markLate({ installmentId: inst.id, lateFeePercent: Number(lateFee), reason })
    toast.success('Atraso registrado.')
    setLateOpen(false)
    onChange()
  }

  async function handleUnmark() {
    const ok = await confirm({
      title: 'Tirar o atraso?',
      description: 'O juros de atraso desta parcela será removido.',
      confirmLabel: 'Tirar atraso',
    })
    if (!ok) return
    await unmarkLate(inst.id)
    onChange()
  }

  const statusLabel =
    inst.status === 'PAID' ? 'paga' : inst.status === 'PARTIAL' ? 'parcial' : 'em aberto'

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">Parcela {inst.number}</p>
          {editingDue ? (
            <div className="mt-1 flex items-center gap-1">
              <DatePicker
                aria-label="Novo vencimento"
                className="w-44"
                value={dueValue}
                onChange={setDueValue}
              />
              <Button size="sm" className="h-8" onClick={handleSaveDue}>
                Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => setEditingDue(false)}
              >
                cancelar
              </Button>
            </div>
          ) : (
            <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span className="whitespace-nowrap">Vence {formatDate(inst.dueDate)}</span>
              <button
                className="inline-flex h-7 items-center gap-0.5 rounded px-1 font-medium text-primary underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                aria-label={`Editar vencimento da parcela ${inst.number}`}
                onClick={() => {
                  setDueValue(inst.dueDate.slice(0, 10))
                  setEditingDue(true)
                }}
              >
                <Pencil className="h-3 w-3" /> editar
              </button>
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            <Tag>{statusLabel}</Tag>
            {inst.overdue && inst.status !== 'PAID' && <Tag tone="red">vencida</Tag>}
            {inst.isLate && <Tag tone="red">+juros atraso</Tag>}
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold tabular-nums">{formatCurrency(inst.effectiveInCents)}</p>
          {inst.paidInCents > 0 && inst.balanceInCents > 0 && (
            <p className="text-xs text-muted-foreground">
              pago {formatCurrency(inst.paidInCents)} · falta{' '}
              {formatCurrency(inst.balanceInCents)}
            </p>
          )}
          {inst.isLate && (
            <p className="text-xs text-destructive">
              orig. {formatCurrency(inst.amountInCents)} +{' '}
              {formatCurrency(inst.lateInterestInCents)}
            </p>
          )}
        </div>
      </div>

      {inst.lateReason && (
        <p className="mt-2 rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
          Motivo do atraso: {inst.lateReason}
        </p>
      )}

      {inst.status !== 'PAID' && (
        <div className="mt-2 flex flex-wrap gap-2">
          {inst.isLate ? (
            <Button size="sm" onClick={handleUnmark}>
              Tirar atraso
            </Button>
          ) : (
            <Dialog open={lateOpen} onOpenChange={setLateOpen}>
              <Button size="sm" variant="destructive" onClick={() => setLateOpen(true)}>
                Marcar atraso
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Marcar atraso</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Aplica juros (padrão 25% sobre o principal em aberto, uma única vez).
                </p>
                <div>
                  <Label htmlFor="late-fee">Taxa de atraso (%)</Label>
                  <Input
                    id="late-fee"
                    inputMode="decimal"
                    value={lateFee}
                    onChange={(e) => setLateFee(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="late-reason">Motivo do atraso</Label>
                  <Textarea
                    id="late-reason"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex.: cliente pediu mais prazo…"
                  />
                </div>
                <Button className="w-full" onClick={handleMarkLate}>
                  Confirmar atraso
                </Button>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  )
}

function AttachmentRows({
  rows,
  setRows,
  allowEmpty = false,
}: {
  rows: AttachRow[]
  setRows: React.Dispatch<React.SetStateAction<AttachRow[]>>
  allowEmpty?: boolean
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            type="file"
            accept="image/*,application/pdf"
            className="flex-1"
            onChange={(e) =>
              setRows((prev) => prev.map((r, j) => (j === i ? { ...r, file: e.target.files?.[0] ?? null } : r)))
            }
          />
          <Select
            aria-label="Forma de pagamento do comprovante"
            className="w-32 shrink-0"
            value={row.method}
            onChange={(e) =>
              setRows((prev) =>
                prev.map((r, j) => (j === i ? { ...r, method: e.target.value as ReceiptMethod | '' } : r)),
              )
            }
          >
            <option value="">forma…</option>
            {ALL_METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m]}
              </option>
            ))}
          </Select>
          {(rows.length > 1 || allowEmpty) && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Remover comprovante"
              onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setRows((prev) => [...prev, { file: null, method: '' }])}
      >
        + comprovante
      </Button>
    </div>
  )
}

function MethodAmountFields({
  methods,
  amounts,
  setAmounts,
  total,
}: {
  methods: ReceiptMethod[]
  amounts: Record<string, number>
  setAmounts: React.Dispatch<React.SetStateAction<Record<string, number>>>
  total: number
}) {
  if (methods.length < 2) return null
  const sum = methods.reduce((s, m) => s + (amounts[m] ?? 0), 0)
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-xs text-muted-foreground">
        Quanto entrou em cada forma (soma deve dar {formatCurrency(total)}):
      </p>
      {methods.map((m) => (
        <div key={m} className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-sm">{METHOD_LABEL[m]}</span>
          <CurrencyInput
            valueInCents={amounts[m] ?? 0}
            onChangeCents={(c) => setAmounts((prev) => ({ ...prev, [m]: c }))}
          />
        </div>
      ))}
      <p className={cn('text-sm font-semibold', sum !== total && 'text-destructive')}>
        Soma: {formatCurrency(sum)}
        {sum !== total && ` (faltam ${formatCurrency(total - sum)})`}
      </p>
    </div>
  )
}

function Tag({
  children,
  tone = 'gray',
}: {
  children: React.ReactNode
  tone?: 'gray' | 'red' | 'green'
}) {
  const tones = {
    gray: 'bg-secondary text-muted-foreground',
    red: 'bg-destructive/10 text-destructive',
    green: 'bg-success/10 text-success',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', tones[tone])}>
      {children}
    </span>
  )
}

// Fotos da venda (025): etiqueta do marketplace, nº de série, comprovante de
// entrega (motoqueiro/Uber)… Anexa e remove sem sair da tela.
const PHOTO_KINDS = ['Etiqueta', 'Número de série', 'Entrega', 'Outra']

function SalePhotosSection({ sale, onChange }: { sale: Sale; onChange: () => void }) {
  const confirm = useConfirm()
  const [kind, setKind] = useState(PHOTO_KINDS[0])
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [inputKey, setInputKey] = useState(0)

  const photos = sale.attachments ?? []

  async function handleAdd() {
    if (!files.length) return toast.error('Escolha a(s) foto(s).')
    setSending(true)
    try {
      await addSaleAttachments(sale.id, kind, files)
      toast.success('Foto(s) anexada(s)!')
      setFiles([])
      setInputKey((k) => k + 1)
      onChange()
    } catch {
      toast.error('Não foi possível anexar.')
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Excluir esta foto?',
      confirmLabel: 'Excluir',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteSaleAttachment(sale.id, id)
      onChange()
    } catch {
      toast.error('Não foi possível excluir.')
    }
  }

  return (
    <div className="rounded-md bg-secondary/40 p-3">
      <p className="mb-2 flex items-center gap-1 font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <Camera className="h-3.5 w-3.5" /> Fotos da venda
      </p>

      {photos.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {photos.map((photo) => (
            <span
              key={photo.id}
              className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-1 text-xs font-medium shadow-sm"
            >
              <a
                className="text-primary underline-offset-2 hover:underline"
                href={`${import.meta.env.VITE_API_URL}/comprovantes/${photo.path}`}
                target="_blank"
                rel="noreferrer"
              >
                {photo.kind ?? 'foto'}
              </a>
              <button
                aria-label="Excluir foto"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(photo.id)}
              >
                <Undo2 className="hidden" />
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Tipo da foto"
          className="w-44"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {PHOTO_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
        <Input
          key={inputKey}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="max-w-xs flex-1"
          aria-label="Fotos da venda"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        <Button size="sm" variant="outline" onClick={handleAdd} loading={sending} disabled={!files.length}>
          Anexar
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Etiqueta do marketplace, foto do nº de série, entrega (motoqueiro/Uber)…
      </p>
    </div>
  )
}

// Venda sem produto do sistema: alerta de obrigação + vínculo do produto
// registrado (não altera total/parcelas; corrige custo/lucro e descrição).
function LinkProductBanner({ sale, onChange }: { sale: Sale; onChange: () => void }) {
  const [open, setOpen] = useState(false)
  const [unitId, setUnitId] = useState('')
  const [saving, setSaving] = useState(false)
  const { data: stock } = useQuery({
    queryKey: ['stock-units', 'AVAILABLE'],
    queryFn: () => fetchStockUnits({ status: 'AVAILABLE' }),
    enabled: open,
  })

  async function handleLink() {
    if (!unitId) return toast.error('Escolha a unidade do estoque.')
    setSaving(true)
    try {
      await addSaleItem(sale.id, unitId)
      toast.success('Produto vinculado — venda regularizada!')
      queryClient.invalidateQueries({ queryKey: ['stock-units'] })
      setOpen(false)
      onChange()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      toast.error(msg ?? 'Não foi possível vincular.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Sem produto do sistema — registre/vincule o produto desta venda.
      </p>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Vincular produto
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular produto do estoque</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Escolha a unidade vendida. O total e as parcelas não mudam — o custo
            entra no lucro e a garantia passa a valer.
          </p>
          <Select
            aria-label="Unidade do estoque"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
          >
            <option value="">Selecionar…</option>
            {(stock?.units ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.product.name}
                {u.imei1 ? ` · IMEI ${u.imei1.slice(-6)}` : u.serialNumber ? ` · SN ${u.serialNumber}` : ''}
                {` · custo ${formatCurrency(u.finalCostInCents)}`}
              </option>
            ))}
          </Select>
          {(stock?.units ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhuma unidade disponível — dê entrada na compra na aba Loja primeiro.
            </p>
          )}
          <Button className="w-full" onClick={handleLink} loading={saving} disabled={!unitId}>
            Vincular à venda
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
