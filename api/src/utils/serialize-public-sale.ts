import { SaleWithDetails } from '@/repositories/sales-repository'
import { serializeSale, InstallmentStatus } from '@/utils/serialize-sale'
import { buildWhatsappUrl, PixKeyType } from '@/utils/build-charge-message'

// Visão pública da venda (023): whitelist EXPLÍCITA dos campos seguros.
// NUNCA expõe custo/lucro (productCostInCents, profitInCents, productValueInCents),
// ids internos, nem dados de outras vendas/clientes (FR-009/NFR-002).
export interface PublicSaleView {
  saleDescription: string | null
  customerName: string
  creditorName: string
  totalInCents: number
  downPaymentInCents: number
  totalPaidInCents: number
  balanceInCents: number
  settled: boolean
  installments: {
    number: number
    amountInCents: number
    dueDate: Date
    status: InstallmentStatus
    overdue: boolean
    balanceInCents: number
  }[]
  receipts: {
    receivedAt: Date
    amountInCents: number
    methods: string[]
    methodAmountsInCents: number[]
    attachments: { path: string; method: string | null }[]
    receiptPath: string | null
  }[]
  // 025 — itens vendidos: só nome e garantia (NUNCA custo/lucro/dados de compra)
  items?: { name: string; warrantyUntil: Date | null }[]
  pix?: { type: PixKeyType; key: string; holderName: string; bankName: string }
  contact?: { phone: string; whatsappUrl: string }
}

export interface PublicSaleContext {
  creditorName: string
  pixKey?: {
    type: PixKeyType
    key: string
    holderName: string
    bankName: string
  } | null
  contactPhone?: string | null
}

export function serializePublicSale(
  sale: SaleWithDetails,
  ctx: PublicSaleContext,
): PublicSaleView {
  // Reaproveita a derivação interna (alocação de recebimentos, status, saldo)
  // para manter consistência com a visão do dono (FR-010).
  const s = serializeSale(sale)

  const view: PublicSaleView = {
    saleDescription: sale.description,
    customerName: sale.customer.name,
    creditorName: ctx.creditorName,
    totalInCents: s.totalDueInCents,
    downPaymentInCents: sale.downPaymentInCents,
    totalPaidInCents: s.totalPaidInCents,
    balanceInCents: s.balanceInCents,
    settled: s.settled,
    installments: s.installments.map((inst) => ({
      number: inst.number,
      amountInCents: inst.effectiveInCents,
      dueDate: inst.dueDate,
      status: inst.status,
      overdue: inst.overdue,
      balanceInCents: inst.balanceInCents,
    })),
    receipts: s.receipts.map((r) => ({
      receivedAt: r.receivedAt,
      amountInCents: r.amountInCents,
      methods: r.methods,
      methodAmountsInCents: r.methodAmountsInCents,
      attachments: (r.attachments ?? []).map((a) => ({
        path: a.path,
        method: a.method,
      })),
      receiptPath: r.receiptPath,
    })),
  }

  // 025 — itens da venda (quando houver), com a garantia visível ao comprador.
  if (sale.items.length > 0) {
    view.items = sale.items.map((item) => ({
      name: item.nameSnapshot,
      warrantyUntil: item.warrantyUntil,
    }))
  }

  // PIX padrão do dono (US3) — omitido quando ausente.
  if (ctx.pixKey) {
    view.pix = {
      type: ctx.pixKey.type,
      key: ctx.pixKey.key,
      holderName: ctx.pixKey.holderName,
      bankName: ctx.pixKey.bankName,
    }
  }

  // Contato do credor (US3) — omitido quando ausente.
  const whatsappUrl = buildWhatsappUrl(
    ctx.contactPhone,
    `Olá! Falo sobre a compra${sale.description ? ` (${sale.description})` : ''}.`,
  )
  if (ctx.contactPhone && whatsappUrl) {
    view.contact = { phone: ctx.contactPhone, whatsappUrl }
  }

  return view
}
