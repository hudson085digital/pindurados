import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import { getCustomerDetails, deleteCustomer } from '@/api/customers'
import { deleteSale } from '@/api/sales'
import {
  payInstallment,
  markInstallmentLate,
  unmarkInstallmentLate,
} from '@/api/installments'
import { Installment, Sale } from '@/api/types'
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

  async function handleDeleteCustomer() {
    if (!confirm('Excluir este devedor e TODAS as vendas dele?')) return
    await removeCustomer(id!)
    navigate('/devedores')
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

function SaleCard({ sale, onChange }: { sale: Sale; onChange: () => void }) {
  const { mutateAsync: removeSale } = useMutation({ mutationFn: deleteSale })

  async function handleDelete() {
    if (!confirm('Excluir esta venda?')) return
    await removeSale(sale.id)
    onChange()
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

        <div className="space-y-2">
          {sale.installments.map((inst) => (
            <InstallmentRow key={inst.id} inst={inst} onChange={onChange} />
          ))}
        </div>

        <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
          Excluir venda
        </Button>
      </CardContent>
    </Card>
  )
}

function InstallmentRow({
  inst,
  onChange,
}: {
  inst: Installment
  onChange: () => void
}) {
  const [payOpen, setPayOpen] = useState(false)
  const [lateOpen, setLateOpen] = useState(false)

  // pagamento
  const [amountCents, setAmountCents] = useState(0)
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [file, setFile] = useState<File | null>(null)

  // atraso
  const [lateFee, setLateFee] = useState('25')
  const [reason, setReason] = useState('')

  const { mutateAsync: pay, isPending: paying } = useMutation({ mutationFn: payInstallment })
  const { mutateAsync: markLate } = useMutation({ mutationFn: markInstallmentLate })
  const { mutateAsync: unmarkLate } = useMutation({ mutationFn: unmarkInstallmentLate })

  async function handlePay() {
    if (!amountCents) return toast.error('Informe um valor.')
    try {
      await pay({ installmentId: inst.id, amountInCents: amountCents, paidAt, comprovante: file })
      toast.success('Pagamento registrado!')
      setPayOpen(false)
      setAmountCents(0)
      setFile(null)
      onChange()
    } catch {
      toast.error('Erro ao registrar pagamento.')
    }
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
          <p className="text-xs text-muted-foreground">Vence {formatDate(inst.dueDate)}</p>
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
              falta {formatCurrency(inst.balanceInCents)}
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

      {inst.payments.map((p) => (
        <p key={p.id} className="mt-1 text-xs text-muted-foreground">
          ✓ {formatCurrency(p.amountInCents)} em {formatDate(p.paidAt)}
          {p.receiptPath && (
            <>
              {' · '}
              <a
                className="text-primary"
                href={`${import.meta.env.VITE_API_URL}/comprovantes/${p.receiptPath}`}
                target="_blank"
                rel="noreferrer"
              >
                comprovante
              </a>
            </>
          )}
        </p>
      ))}

      {inst.status !== 'PAID' && (
        <div className="mt-2 flex flex-wrap gap-2">
          {/* PAGAMENTO */}
          <Dialog open={payOpen} onOpenChange={setPayOpen}>
            <Button size="sm" variant="outline" onClick={() => setPayOpen(true)}>
              Registrar pagamento
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar pagamento</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Pode ser o total ou só uma parte.
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
                <Label>Data</Label>
                <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </div>
              <div>
                <Label>Comprovante (foto/PDF)</Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <Button className="w-full" onClick={handlePay} disabled={paying}>
                Salvar pagamento
              </Button>
            </DialogContent>
          </Dialog>

          {/* ATRASO */}
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
                  Aplica juros (padrão 25% sobre a parcela, uma única vez).
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
