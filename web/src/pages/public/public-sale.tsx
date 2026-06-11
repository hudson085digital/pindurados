import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, MessageCircle } from 'lucide-react'
import { getPublicSale } from '@/api/public'
import { ReceiptMethod } from '@/api/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const METHOD_LABEL: Record<ReceiptMethod, string> = {
  PIX: 'Pix',
  CARD: 'Cartão',
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
  CASH: 'Dinheiro',
}

const STATUS_LABEL: Record<string, string> = {
  PAID: 'paga',
  PARTIAL: 'parcial',
  OPEN: 'em aberto',
}

function comprovanteUrl(path: string) {
  return `${import.meta.env.VITE_API_URL}/comprovantes/${path}`
}

export function PublicSale() {
  const { token } = useParams<{ token: string }>()

  const { data: sale, isLoading, isError } = useQuery({
    queryKey: ['public-sale', token],
    queryFn: () => getPublicSale(token!),
    enabled: !!token,
    retry: false,
  })

  if (isLoading) {
    return (
      <Centered>
        <p className="text-muted-foreground">Carregando…</p>
      </Centered>
    )
  }

  if (isError || !sale) {
    return (
      <Centered>
        <div className="text-center">
          <p className="text-lg font-semibold">Link indisponível</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Este link não está mais ativo. Peça um novo ao vendedor.
          </p>
        </div>
      </Centered>
    )
  }

  const visibleReceipts = sale.receipts.filter((r) => r.amountInCents !== 0)

  async function copyPix() {
    if (!sale?.pix) return
    await navigator.clipboard.writeText(sale.pix.key)
    toast.success('Chave Pix copiada!')
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md space-y-3 bg-background p-4">
      {/* Cabeçalho */}
      <div className="pt-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Crediário
        </p>
        <p className="text-lg font-semibold">{sale.saleDescription || 'Sua compra'}</p>
        <p className="text-sm text-muted-foreground">
          {sale.customerName} · credor: {sale.creditorName}
        </p>
      </div>

      {/* Resumo */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <Row label="Valor total" value={formatCurrency(sale.totalInCents)} />
          {sale.downPaymentInCents > 0 && (
            <Row label="Entrada" value={formatCurrency(sale.downPaymentInCents)} />
          )}
          <Row label="Já pago" value={formatCurrency(sale.totalPaidInCents)} />
          <div className="border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {sale.settled ? 'Status' : 'Saldo devedor'}
              </span>
              <span
                className={cn(
                  'text-lg font-bold',
                  sale.settled
                    ? 'text-primary'
                    : sale.balanceInCents > 0
                      ? 'text-destructive'
                      : 'text-primary',
                )}
              >
                {sale.settled ? 'QUITADA ✅' : formatCurrency(sale.balanceInCents)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Como pagar (PIX) — só se houver chave e ainda houver saldo */}
      {sale.pix && !sale.settled && sale.balanceInCents > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Como pagar
            </p>
            <p className="text-sm">
              Pague <strong>{formatCurrency(sale.balanceInCents)}</strong> via Pix:
            </p>
            <div className="flex items-center justify-between gap-2 rounded-md border bg-secondary/40 p-2">
              <span className="min-w-0 truncate font-mono text-sm">{sale.pix.key}</span>
              <Button size="sm" variant="outline" onClick={copyPix}>
                <Copy className="mr-1 h-4 w-4" /> Copiar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {sale.pix.holderName} · {sale.pix.bankName}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Parcelas */}
      <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Parcelas
      </p>
      <div className="space-y-2">
        {sale.installments.map((inst) => (
          <Card key={inst.number}>
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium">Parcela {inst.number}</p>
                <p className="text-xs text-muted-foreground">
                  Vence {formatDate(inst.dueDate)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Tag>{STATUS_LABEL[inst.status] ?? inst.status}</Tag>
                  {inst.overdue && inst.status !== 'PAID' && <Tag tone="red">vencida</Tag>}
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(inst.amountInCents)}</p>
                {inst.balanceInCents > 0 && inst.balanceInCents !== inst.amountInCents && (
                  <p className="text-xs text-muted-foreground">
                    falta {formatCurrency(inst.balanceInCents)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recebimentos */}
      {visibleReceipts.length > 0 && (
        <>
          <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pagamentos registrados
          </p>
          <Card>
            <CardContent className="space-y-1 p-3">
              {visibleReceipts.map((r, idx) => {
                const isReversal = r.amountInCents < 0
                return (
                  <div key={idx} className="text-xs">
                    <span className={cn(isReversal && 'text-muted-foreground')}>
                      {isReversal ? '↩ Estorno ' : '✓ '}
                      <strong>{formatCurrency(Math.abs(r.amountInCents))}</strong>
                      {r.methods.length > 0 &&
                        ` · ${r.methods.map((m) => METHOD_LABEL[m]).join(' + ')}`}
                      {' · '}
                      {formatDate(r.receivedAt)}
                      {r.attachments.map((a, i) => (
                        <span key={i}>
                          {' · '}
                          <a
                            className="text-primary"
                            href={comprovanteUrl(a.path)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {a.method ? METHOD_LABEL[a.method] : `comprovante ${i + 1}`}
                          </a>
                        </span>
                      ))}
                      {r.receiptPath && r.attachments.length === 0 && (
                        <span>
                          {' · '}
                          <a
                            className="text-primary"
                            href={comprovanteUrl(r.receiptPath)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            comprovante
                          </a>
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      )}

      {/* Falar com o credor */}
      {sale.contact && (
        <Button asChild className="w-full" size="lg">
          <a href={sale.contact.whatsappUrl} target="_blank" rel="noreferrer">
            <MessageCircle className="mr-2 h-5 w-5" /> Falar com o credor
          </a>
        </Button>
      )}

      <p className="pb-6 pt-2 text-center text-[11px] text-muted-foreground">
        Página somente leitura · Pindurados
      </p>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
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
