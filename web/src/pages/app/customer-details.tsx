import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, Undo2, Send, Bell, Pencil } from 'lucide-react'
import { getCustomerDetails, deleteCustomer, updateCustomer } from '@/api/customers'
import { deleteSale, getChargeMessage, updateSale } from '@/api/sales'
import { createReceipt, updateReceipt, voidReceipt } from '@/api/receipts'
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
    return <p className="py-10 text-center text-muted-foreground">Carregando…</p>
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
                'text-lg font-bold',
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
        <p className="py-6 text-center text-muted-foreground">Nenhuma venda registrada.</p>
      )}

      {sales.map((sale) => (
        <SaleCard key={sale.id} sale={sale} onChange={refresh} />
      ))}
    </div>
  )
}

const METHOD_LABEL: Record<ReceiptMethod, string> = {
  PIX: 'Pix',
  CASH: 'Dinheiro',
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
  // Reparcelamento (opcional)
  const [reparcelar, setReparcelar] = useState(false)
  const [editProductValue, setEditProductValue] = useState(sale.productValueInCents)
  const [editInterest, setEditInterest] = useState(String(sale.interestPercent))
  const [editInstallments, setEditInstallments] = useState(String(sale.installments.length))
  const { mutateAsync: saveSale, isPending: saving } = useMutation({
    mutationFn: () =>
      updateSale(sale.id, {
        description: editDesc || null,
        productCostInCents: editCost,
        saleDate: editDate,
        ...(reparcelar
          ? {
              type: 'MANUAL',
              productValueInCents: editProductValue,
              interestPercent: Number(editInterest) || 0,
              installmentsCount: Number(editInstallments) || 1,
            }
          : {}),
      }),
  })

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
              {sale.type === 'MANUAL' ? 'Manual' : 'Automática'} · {formatDate(sale.saleDate)}
            </p>
          </div>
          <span
            className={cn(
              'font-bold',
              sale.balanceInCents > 0 ? 'text-destructive' : 'text-primary',
            )}
          >
            {sale.settled ? 'QUITADA' : formatCurrency(sale.balanceInCents)}
          </span>
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
                setEditProductValue(sale.productValueInCents)
                setEditInterest(String(sale.interestPercent))
                setEditInstallments(String(sale.installments.length))
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
                <span>Reparcelar (alterar valor / nº de parcelas)</span>
                <span className="font-semibold">{reparcelar ? 'ON' : 'OFF'}</span>
              </button>

              {reparcelar && (
                <div className="space-y-3 rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Regenera as parcelas. O que já foi recebido é mantido e abatido do novo total.
                  </p>
                  <div>
                    <Label>Valor do produto (R$)</Label>
                    <CurrencyInput valueInCents={editProductValue} onChangeCents={setEditProductValue} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Juros (%)</Label>
                      <Input
                        inputMode="decimal"
                        value={editInterest}
                        onChange={(e) => setEditInterest(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Nº de parcelas</Label>
                      <Input
                        type="number"
                        min={1}
                        value={editInstallments}
                        onChange={(e) => setEditInstallments(e.target.value)}
                      />
                    </div>
                  </div>
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

        <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
          Excluir venda
        </Button>
      </CardContent>
    </Card>
  )
}

function ReceiptsSection({ sale, onChange }: { sale: Sale; onChange: () => void }) {
  const [open, setOpen] = useState(false)
  const [amountCents, setAmountCents] = useState(0)
  const [method, setMethod] = useState<ReceiptMethod>('PIX')
  const [receivedAt, setReceivedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const { mutateAsync: create, isPending } = useMutation({ mutationFn: createReceipt })
  const { mutateAsync: revert } = useMutation({ mutationFn: voidReceipt })
  const { mutateAsync: edit, isPending: editing } = useMutation({ mutationFn: updateReceipt })

  // Edição de um recebimento existente
  const [editId, setEditId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState(0)
  const [editMethod, setEditMethod] = useState<ReceiptMethod>('PIX')
  const [editDate, setEditDate] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editFile, setEditFile] = useState<File | null>(null)

  function openEdit(r: Receipt) {
    setEditId(r.id)
    setEditAmount(r.amountInCents)
    setEditMethod(r.method)
    setEditDate(r.receivedAt.slice(0, 10))
    setEditNote(r.note ?? '')
    setEditFile(null)
  }

  async function handleEdit() {
    if (!editId) return
    if (!editAmount) return toast.error('Informe um valor.')
    try {
      await edit({
        saleId: sale.id,
        receiptId: editId,
        amountInCents: editAmount,
        method: editMethod,
        receivedAt: editDate,
        note: editNote,
        comprovante: editFile,
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
    if (!file) return toast.error('Anexe o comprovante de pagamento.')
    if (amountCents > sale.balanceInCents) {
      return toast.error(
        `Valor acima do saldo. Receba no máximo ${formatCurrency(sale.balanceInCents)}.`,
      )
    }
    try {
      await create({ saleId: sale.id, amountInCents: amountCents, method, comprovante: file, receivedAt, note })
      toast.success('Recebimento registrado!')
      setOpen(false)
      setAmountCents(0)
      setNote('')
      setFile(null)
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
                <Label>Forma</Label>
                <div className="mt-1 flex gap-2">
                  {(['PIX', 'CASH'] as ReceiptMethod[]).map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={method === m ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setMethod(m)}
                    >
                      {METHOD_LABEL[m]}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={receivedAt}
                  onChange={(e) => setReceivedAt(e.target.value)}
                />
              </div>
              <div>
                <Label>Comprovante (foto/PDF) *</Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
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
            return (
              <li key={r.id} className="flex items-center justify-between text-xs">
                <span className={cn(isReversal && 'text-muted-foreground')}>
                  {isReversal ? '↩ Estorno ' : '✓ '}
                  <strong>{formatCurrency(Math.abs(r.amountInCents))}</strong> ·{' '}
                  {METHOD_LABEL[r.method]} · {formatDate(r.receivedAt)}
                  {r.note && !isReversal && ` · ${r.note}`}
                  {r.receiptPath && (
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
            <Label>Forma</Label>
            <div className="mt-1 flex gap-2">
              {(['PIX', 'CASH'] as ReceiptMethod[]).map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={editMethod === m ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setEditMethod(m)}
                >
                  {METHOD_LABEL[m]}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
          </div>
          <div>
            <Label>Trocar comprovante (opcional)</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Deixe vazio para manter o comprovante atual.
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
