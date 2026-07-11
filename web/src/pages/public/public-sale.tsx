import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, MessageCircle, Check, Undo2 } from 'lucide-react'
import { getPublicSale } from '@/api/public'
import { RECEIPT_METHOD_LABELS } from '@pindurados/core'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { Skeleton } from '@/components/ui/skeleton'

// Rótulos vêm da fonte única do core.
const METHOD_LABEL = RECEIPT_METHOD_LABELS

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
      <div className="mx-auto min-h-[100dvh] w-full max-w-md space-y-3 p-4">
        <div className="flex flex-col items-center gap-2 pt-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
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
  const paidPct = sale.totalInCents > 0
    ? Math.min(100, Math.round((sale.totalPaidInCents / sale.totalInCents) * 100))
    : 0

  async function copyPix() {
    if (!sale?.pix) return
    await navigator.clipboard.writeText(sale.pix.key)
    toast.success('Chave Pix copiada!')
  }

  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-md space-y-3 bg-background p-4">
      {/* Cabeçalho */}
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <Logo />
        <div>
          <p className="text-lg font-semibold">{sale.saleDescription || 'Sua compra'}</p>
          <p className="text-sm text-muted-foreground">
            {sale.customerName} · credor: {sale.creditorName}
          </p>
        </div>
      </div>

      {/* Resumo */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <Row label="Valor total" value={formatCurrency(sale.totalInCents)} />
          {sale.downPaymentInCents > 0 && (
            <Row label="Entrada" value={formatCurrency(sale.downPaymentInCents)} />
          )}
          <Row label="Já pago" value={formatCurrency(sale.totalPaidInCents)} />
          <div className="pt-1">
            <div
              role="progressbar"
              aria-valuenow={paidPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Percentual pago"
              className="h-2 w-full overflow-hidden rounded-full bg-secondary"
            >
              <div
                className="h-full rounded-full bg-brand-gradient transition-[width] duration-500 ease-out"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
              {paidPct}% pago
            </p>
          </div>
          <div className="border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {sale.settled ? 'Status' : 'Saldo devedor'}
              </span>
              {sale.settled ? (
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-success">
                  Quitada
                </span>
              ) : (
                <span
                  className={cn(
                    'text-lg font-bold tabular-nums',
                    sale.balanceInCents > 0 ? 'text-destructive' : 'text-success',
                  )}
                >
                  {formatCurrency(sale.balanceInCents)}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 025 — Itens da compra com garantia */}
      {(sale.items?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Itens da compra
            </p>
            <ul className="divide-y divide-border/60">
              {sale.items!.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0">
                  <span className="min-w-0 truncate font-medium">{item.name}</span>
                  {item.warrantyUntil && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      garantia até {formatDate(item.warrantyUntil)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Como pagar (PIX) — só se houver chave e ainda houver saldo */}
      {sale.pix && !sale.settled && sale.balanceInCents > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
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
      <p className="pt-1 font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
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
                <p className="font-bold tabular-nums">{formatCurrency(inst.amountInCents)}</p>
                {inst.balanceInCents > 0 && inst.balanceInCents !== inst.amountInCents && (
                  <p className="text-xs text-muted-foreground tabular-nums">
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
          <p className="pt-1 font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Pagamentos registrados
          </p>
          <Card>
            <CardContent className="space-y-1 p-3">
              {visibleReceipts.map((r, idx) => {
                const isReversal = r.amountInCents < 0
                return (
                  <div key={idx} className="flex items-start gap-1.5 py-0.5 text-xs">
                    {isReversal ? (
                      <Undo2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="estorno" />
                    ) : (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-label="pago" />
                    )}
                    <span className={cn('min-w-0', isReversal && 'text-muted-foreground')}>
                      {isReversal && 'Estorno '}
                      <strong className="tabular-nums">{formatCurrency(Math.abs(r.amountInCents))}</strong>
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
        Página somente leitura · mobphone
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
      <span className="font-medium tabular-nums">{value}</span>
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
