// Mapeia linhas do SQLite (snake_case) para os tipos do app (camelCase).
import type {
  Customer,
  SaleRow,
  InstallmentRow,
  ReceiptRow,
  AttachmentRow,
  PixKey,
  Settings,
  ReceiptMethod,
  PixKeyType,
  SaleType,
} from './model'

const bool = (v: unknown): boolean => v === 1 || v === true
const jsonArr = <T,>(v: unknown): T[] => {
  if (typeof v !== 'string' || !v) return []
  try {
    const parsed = JSON.parse(v)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export function rowToCustomer(r: any): Customer {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone ?? null,
    note: r.note ?? null,
    autoReminder: bool(r.auto_reminder),
    createdAt: r.created_at,
  }
}

export function rowToSale(r: any): SaleRow {
  return {
    id: r.id,
    customerId: r.customer_id,
    description: r.description ?? null,
    type: r.type as SaleType,
    productValueInCents: r.product_value_in_cents,
    productCostInCents: r.product_cost_in_cents,
    downPaymentInCents: r.down_payment_in_cents,
    interestPercent: r.interest_percent,
    lateFeePercent: r.late_fee_percent,
    totalInCents: r.total_in_cents,
    saleDate: r.sale_date,
    createdAt: r.created_at,
  }
}

export function rowToInstallment(r: any): InstallmentRow {
  return {
    id: r.id,
    saleId: r.sale_id,
    number: r.number,
    amountInCents: r.amount_in_cents,
    dueDate: r.due_date,
    isLate: bool(r.is_late),
    lateInterestInCents: r.late_interest_in_cents,
    lateFeePercent: r.late_fee_percent ?? null,
    lateReason: r.late_reason ?? null,
  }
}

export function rowToAttachment(r: any): AttachmentRow {
  return {
    id: r.id,
    receiptId: r.receipt_id,
    path: r.path,
    method: (r.method ?? null) as ReceiptMethod | null,
    mime: r.mime ?? null,
    createdAt: r.created_at,
  }
}

export function rowToReceipt(r: any, attachments: AttachmentRow[]): ReceiptRow {
  return {
    id: r.id,
    saleId: r.sale_id,
    amountInCents: r.amount_in_cents,
    methods: jsonArr<ReceiptMethod>(r.methods),
    methodAmountsInCents: jsonArr<number>(r.method_amounts_in_cents),
    receivedAt: r.received_at,
    note: r.note ?? null,
    reversesReceiptId: r.reverses_receipt_id ?? null,
    createdAt: r.created_at,
    attachments,
  }
}

export function rowToPixKey(r: any): PixKey {
  return {
    id: r.id,
    type: r.type as PixKeyType,
    key: r.key,
    bankName: r.bank_name,
    holderName: r.holder_name,
    isDefault: bool(r.is_default),
    createdAt: r.created_at,
  }
}

export function rowToSettings(r: any): Settings {
  return {
    ownerName: r?.owner_name ?? null,
    contactPhone: r?.contact_phone ?? null,
    defaultLateFeePercent: r?.default_late_fee_percent ?? 25,
    lastBackupAt: r?.last_backup_at ?? null,
  }
}
