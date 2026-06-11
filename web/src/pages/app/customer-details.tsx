import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, Undo2, Send, Bell, Pencil, Link2, Copy, Trash2, Receipt as ReceiptIcon } from 'lucide-react'
import { getCustomerDetails, deleteCustomer, updateCustomer } from '@/api/customers'
import { deleteSale, getChargeMessage, updateSale } from '@/api/sales'
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
import { formatCurrency, formatDate, cn } from '@/lib/utils'
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

export function CustomerDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

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
    if (!confirm('Excluir este devedor e TODAS as vendas dele?')) return
    await removeCustomer(id!)
    navigate('/devedores')
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
      <Link to="/devedores" className="flex items-center text-sm font-medium text-primary">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </Link>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">{customer.name}</p>
              <p className="text-sm text-muted-foreground">
                {customer.phone || 'sem contato'}
              </p>
            </div>
            <span
              className={cn(
                'text-lg font-bold tabular-nums',
                balanceInCents > 0 ? 'text-destructive' : 'text-primary',
              )}
            >
              {formatCurrency(balanceInCents)}
            </span>
          </div>
          {customer.note && (
            <p className="mt-2 text-sm text-muted-foreground">{customer.note}</p>
          )}
          <button
            onClick={() => handleToggleReminder(!customer.autoReminder)}
            className={cn(
              'mt-3 flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm',
              customer.autoReminder
                ? 'border-primary/40 bg-primary/5 text-primary'
                : 'text-muted-foreground',
            )}
          >
            <span className="flex items-center gap-2">
              <Bell className="h-4 w-4" /> Lembrete automático de cobrança
            </span>
            <span className="font-semibold">{customer.autoReminder ? 'ON' : 'OFF'}</span>
          </button>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button asChild size="sm" className="flex-1">
          <Link to={`/nova-venda?customerId=${customer.id}`}>+ Nova venda</Link>
        </Button>
        <Button size="sm" variant="destructive" onClick={handleDeleteCustomer}>
          Excluir devedor
        </Button>
      </div>

      <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Vendas
      </p>

      {sales.length === 0 && (
        <EmptyState
          icon={ReceiptIcon}
          title="Nenhuma venda ainda"
          description="Registre a primeira venda fiado deste cliente para acompanhar parcelas e recebimentos."
          action={
            <Button asChild className="w-full">
              <Link to={`/nova-venda?customerId=${customer.id}`}>+ Nova venda</Link>
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

const METHOD_LABEL: Record<ReceiptMethod, string> = {
  PIX: 'Pix',
  CARD: 'Cartão',
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
  CASH: 'Dinheiro',
}

const ALL_METHODS: ReceiptMethod[] = ['PIX', 'CARD', 'CREDIT', 'DEBIT', 'CASH']

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
    if (!confirm('Excluir esta venda?')) return
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
              {sale.type === 'BY_TOTAL' ? 'Por valor final' : sale.type === 'AUTOMATIC' ? 'Automática' : 'Manual'}{' '}
              · {formatDate(sale.saleDate)}
            </p>
          </div>
          {sale.settled ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Quitada
            </span>
          ) : (
            <span
              className={cn(
                'shrink-0 font-bold tabular-nums',
                sale.balanceInCents > 0 ? 'text-destructive' : 'text-primary',
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
            <span className="font-semibold text-primary">
              lucro previsto {formatCurrency(sale.profitInCents)}
            </span>
          </p>
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
                <Label>Descrição</Label>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </div>
              <div>
                <Label>Custo do produto (R$)</Label>
                <CurrencyInput valueInCents={editCost} onChangeCents={setEditCost} />
              </div>
              <div>
                <Label>Data da venda</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>

              <button
                type="button"
                onClick={() => setReparcelar((v) => !v)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm',
                  reparcelar ? 'border-primary/40 bg-primary/5 text-primary' : 'text-muted-foreground',
                )}
              >
                <span>Reparcelar (valor e data de cada parcela)</span>
                <span className="font-semibold">{reparcelar ? 'ON' : 'OFF'}</span>
              </button>

              {reparcelar && (
                <div className="space-y-3 rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Você define o valor das parcelas; a última completa o total
                    automaticamente. O que já foi recebido é mantido.
                  </p>
                  <div>
                    <Label>Valor da venda (total)</Label>
                    <CurrencyInput valueInCents={editTotal} onChangeCents={setEditTotal} />
                  </div>
                  <div>
                    <Label>Nº de parcelas</Label>
                    <Input
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
                          <Input
                            type="date"
                            className="w-40"
                            value={p.date}
                            onChange={(e) =>
                              setParcels((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)),
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

              <Button className="w-full" onClick={handleSaveSale} disabled={saving}>
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

        <ReceiptsSection sale={sale} onChange={onChange} />

        <ShareLinkSection saleId={sale.id} />

        <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
          Excluir venda
        </Button>
      </CardContent>
    </Card>
  )
}

function ShareLinkSection({ saleId }: { saleId: string }) {
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
    if (!confirm('Revogar o link? Quem tiver o endereço deixará de ver a venda.')) return
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
        <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
          Gere um link para o devedor acompanhar esta venda sem login.
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
    if (!confirm(`Estornar o recebimento de ${formatCurrency(receipt.amountInCents)}?`)) return
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
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                <Label>Valor recebido (R$) *</Label>
                <CurrencyInput
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
                <Label>Data</Label>
                <Input
                  type="date"
                  value={receivedAt}
                  onChange={(e) => setReceivedAt(e.target.value)}
                />
              </div>
              <div>
                <Label>Comprovantes (foto/PDF)</Label>
                <AttachmentRows rows={attachRows} setRows={setAttachRows} allowEmpty />
                <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={deferProof}
                    onChange={(e) => setDeferProof(e.target.checked)}
                  />
                  Anexar comprovante depois (ficará em alerta até anexar)
                </label>
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isPending}>
                Salvar recebimento
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {sale.receipts.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum recebimento ainda.</p>
      ) : (
        <ul className="space-y-1">
          {sale.receipts.map((r) => {
            const isReversal = r.amountInCents < 0
            const alreadyReversed = reversedIds.has(r.id)
            const pendingProof =
              !isReversal && !alreadyReversed && !r.receiptPath && r.attachments.length === 0
            return (
              <li key={r.id} className="flex items-center justify-between text-xs">
                <span className={cn(isReversal && 'text-muted-foreground')}>
                  {isReversal ? '↩ Estorno ' : '✓ '}
                  <strong>{formatCurrency(Math.abs(r.amountInCents))}</strong> ·{' '}
                  {methodsLabel(r.methods, r.methodAmountsInCents)} · {formatDate(r.receivedAt)}
                  {r.note && !isReversal && ` · ${r.note}`}
                  {r.attachments.map((a, i) => (
                    <span key={a.id}>
                      {' · '}
                      <a
                        className="text-primary"
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
                        className="text-primary"
                        href={`${import.meta.env.VITE_API_URL}/comprovantes/${r.receiptPath}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        comprovante
                      </a>
                    </>
                  )}
                  {pendingProof && (
                    <span className="ml-1 rounded-full bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">
                      ⚠ sem comprovante
                    </span>
                  )}
                </span>
                {!isReversal && !alreadyReversed && (
                  <span className="ml-2 flex shrink-0 items-center gap-2">
                    <button
                      className="flex items-center gap-0.5 text-primary"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="h-3 w-3" /> editar
                    </button>
                    <button
                      className="flex items-center gap-0.5 text-destructive"
                      onClick={() => handleVoid(r)}
                    >
                      <Undo2 className="h-3 w-3" /> estornar
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
            <Label>Valor (R$)</Label>
            <CurrencyInput valueInCents={editAmount} onChangeCents={setEditAmount} />
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
            <Label>Data</Label>
            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
          </div>
          <div>
            <Label>Adicionar comprovantes (opcional)</Label>
            <AttachmentRows rows={editAttachRows} setRows={setEditAttachRows} allowEmpty />
            <p className="mt-1 text-xs text-muted-foreground">
              Mantém os comprovantes atuais e anexa os novos.
            </p>
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea rows={2} value={editNote} onChange={(e) => setEditNote(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleEdit} disabled={editing}>
            Salvar alterações
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InstallmentRow({ inst, onChange }: { inst: Installment; onChange: () => void }) {
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
    if (!confirm('Tirar o atraso e remover o juros desta parcela?')) return
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
              <Input
                type="date"
                className="h-8 w-auto"
                value={dueValue}
                onChange={(e) => setDueValue(e.target.value)}
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
            <p className="text-xs text-muted-foreground">
              Vence {formatDate(inst.dueDate)}{' '}
              <button
                className="text-primary underline"
                onClick={() => {
                  setDueValue(inst.dueDate.slice(0, 10))
                  setEditingDue(true)
                }}
              >
                editar
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
          <p className="font-bold">{formatCurrency(inst.effectiveInCents)}</p>
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
                  <Label>Taxa de atraso (%)</Label>
                  <Input
                    inputMode="decimal"
                    value={lateFee}
                    onChange={(e) => setLateFee(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Motivo do atraso</Label>
                  <Textarea
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
          <select
            className="h-9 rounded-md border border-input bg-card px-2 text-sm transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          </select>
          {(rows.length > 1 || allowEmpty) && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
            >
              <Undo2 className="h-4 w-4 text-destructive" />
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
    green: 'bg-primary/10 text-primary',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', tones[tone])}>
      {children}
    </span>
  )
}
