// Tipos/DTOs do domínio Pindurados — fonte única compartilhada por api, web e mobile.
// Espelha o que o backend serializa. Valores em centavos (Int); datas como ISO string.

export type SaleType = 'AUTOMATIC' | 'MANUAL' | 'BY_TOTAL'
export type InstallmentStatus = 'PAID' | 'PARTIAL' | 'OPEN'
export type ReceiptMethod =
  | 'PIX'
  | 'CASH'
  | 'CARD'
  | 'CREDIT'
  | 'DEBIT'
  | 'BOLETO'
  | 'TRANSFER'
  | 'OTHER'

// Fonte única dos rótulos/ordem das formas de recebimento (web e mobile).
// Para ampliar: adicione no enum do schema.prisma, aqui e no rótulo — só isso.
export const ALL_RECEIPT_METHODS: ReceiptMethod[] = [
  'PIX',
  'CASH',
  'CARD',
  'CREDIT',
  'DEBIT',
  'BOLETO',
  'TRANSFER',
  'OTHER',
]

export const RECEIPT_METHOD_LABELS: Record<ReceiptMethod, string> = {
  PIX: 'Pix',
  CASH: 'Dinheiro',
  CARD: 'Cartão',
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
  BOLETO: 'Boleto',
  TRANSFER: 'Transferência',
  OTHER: 'Outro',
}
export type PixKeyType = 'RANDOM' | 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE'

export interface PixKey {
  id: string
  type: PixKeyType
  key: string
  bankName: string
  holderName: string
  isDefault: boolean
}

export interface ReceiptAttachment {
  id: string
  path: string
  method: ReceiptMethod | null
}

// Recebimento no nível da venda (crediário). Valor negativo = estorno.
export interface Receipt {
  id: string
  amountInCents: number
  methods: ReceiptMethod[]
  methodAmountsInCents: number[]
  attachments: ReceiptAttachment[]
  receivedAt: string
  note: string | null
  receiptPath: string | null
  reversesReceiptId: string | null
  createdAt: string
}

export interface Installment {
  id: string
  number: number
  amountInCents: number
  dueDate: string
  isLate: boolean
  lateInterestInCents: number
  lateFeePercent: number | null
  lateReason: string | null
  // calculados (alocação derivada dos recebimentos)
  paidInCents: number
  latePaidInCents: number
  principalPaidInCents: number
  effectiveInCents: number
  balanceInCents: number
  status: InstallmentStatus
  overdue: boolean
}

export interface Sale {
  id: string
  description: string | null
  type: SaleType
  productValueInCents: number
  productCostInCents: number
  downPaymentInCents: number
  interestPercent: number
  lateFeePercent: number
  totalInCents: number
  saleDate: string
  installments: Installment[]
  receipts: Receipt[]
  totalDueInCents: number
  totalPaidInCents: number
  balanceInCents: number
  profitInCents: number
  receiptsPendingProof: number
  settled: boolean
  // 025 — loja de eletrônicos (opcionais; vendas antigas não têm)
  origin?: string | null
  deliveryType?: SaleDeliveryType | null
  /** Tipo de venda (À vista/Cartão/Promissória — configurável). */
  saleKind?: string | null
  /** Tipo de cliente NESTA venda (Varejo/Revenda). */
  customerKind?: string | null
  /** Fotos da venda: etiqueta, nº de série, comprovante de entrega… */
  attachments?: SalePhoto[]
  items?: SaleItem[]
  marginPercent?: number | null
  markupPercent?: number | null
}

export interface SalePhoto {
  id: string
  kind: string | null
  path: string
  createdAt: string
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  note: string | null
  autoReminder: boolean
  // 025 — loja de eletrônicos (opcionais)
  kind?: CustomerKind | null
  cpfCnpj?: string | null
  instagram?: string | null
  tags?: string[]
  addressZip?: string | null
  addressStreet?: string | null
  addressNumber?: string | null
  addressDistrict?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressComplement?: string | null
}

export interface CustomerWithBalance extends Customer {
  salesCount: number
  balanceInCents: number
}

export interface CalculationResult {
  productValueInCents: number
  downPaymentInCents: number
  interestPercent: number
  remainingInCents: number
  interestInCents: number
  totalInCents: number
  installmentsCount: number
  installmentValuesInCents: number[]
  custom: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// 025 — Loja de eletrônicos: compras → estoque de unidades → itens de venda.
// ─────────────────────────────────────────────────────────────────────────────

// Tipo de cliente é rótulo livre (UserOption) — sem enum.
// Tipo/modelo de produto são ENTIDADES (ver ProductTypeEntity/ProductModelEntity).
export type PurchaseFormat = 'NORMAL' | 'PROMO' | 'MILES' | 'CASHBACK'
export type StockUnitStatus = 'AWAITING' | 'AVAILABLE' | 'SOLD'
export type CustomerKind = string
// Entrega é rótulo livre configurável (UserOption DELIVERY_TYPE) — sem enum.
export type SaleDeliveryType = string
export type UserOptionKind =
  | 'MARKETPLACE'
  | 'SALE_ORIGIN'
  | 'SALE_KIND'
  | 'PAYMENT_METHOD'
  | 'DELIVERY_TYPE'
  | 'PURCHASE_FORMAT'
  | 'PRODUCT_FIELD'
  | 'PRODUCT_TYPE'
  | 'CUSTOMER_KIND'
  | 'BRAND'
  | 'COLOR'
  | 'CATEGORY'
  | 'SUBCATEGORY'
export type PurchaseProductStatus = 'NOT_RECEIVED' | 'RECEIVED' | 'LATE'
export type PurchaseCreditStatus = 'NOT_CREDITED' | 'CREDITED' | 'LATE' | 'N_A'

export interface ProductTypeFieldEntity {
  id: string
  label: string
}

export interface ProductModelEntity {
  id: string
  name: string
}

// Tipo de produto (entidade): dono dos modelos e dos meta fields do tipo.
export interface ProductTypeEntity {
  id: string
  name: string
  models: ProductModelEntity[]
  fields: ProductTypeFieldEntity[]
}

export interface Product {
  id: string
  name: string
  brand: string | null
  color: string | null
  category: string | null
  subcategory: string | null
  sku: string | null
  barcode: string | null
  productTypeId: string | null
  productModelId: string | null
  suggestedPriceInCents: number | null
  warrantyDays: number | null
  minQuantity: number | null
  note: string | null
  /** Valores dos meta fields do tipo: só o que foi preenchido. */
  meta?: Record<string, string | number | boolean | null>
  createdAt: string
  productType?: { id: string; name: string; fields: ProductTypeFieldEntity[] } | null
  productModel?: ProductModelEntity | null
}

export interface ProductWithCounts extends Product {
  awaitingCount: number
  availableCount: number
  soldCount: number
  belowMin: boolean
}

export interface Purchase {
  id: string
  date: string
  orderNumber: string | null
  account: string | null
  marketplace: string | null
  format: PurchaseFormat
  formatLabel: string | null
  quantity: number
  unitValueInCents: number
  freightInCents: number
  paymentMethod: string | null
  bankCard: string | null
  accrualPerReal: number | null
  cpmInCents: number | null
  cashbackPercent: number | null
  expectedCreditInCents: number
  actualCreditInCents: number | null
  nubankAdvance: boolean
  nubankDiscountPercent: number
  productExpectedAt: string | null
  productReceivedAt: string | null
  creditExpectedAt: string | null
  creditReceivedAt: string | null
  note: string | null
  canceled: boolean
  createdAt: string
  product: Pick<Product, 'id' | 'name' | 'brand'>
  /** Unidades geradas pela compra (id + status; dados completos em /stock-units). */
  units?: { id: string; status: StockUnitStatus }[]
  // derivados (serializer)
  paidWithFreightInCents: number
  finalCostInCents: number
  finalCostNubankInCents: number | null
  unitFinalCostInCents: number
  productStatus: PurchaseProductStatus
  creditStatus: PurchaseCreditStatus
}

export interface StockUnit {
  id: string
  status: StockUnitStatus
  finalCostInCents: number
  serialNumber: string | null
  imei1: string | null
  imei2: string | null
  danfe: string | null
  note: string | null
  meta?: Record<string, string | number | boolean | null>
  createdAt: string
  product: Pick<Product, 'id' | 'name' | 'brand' | 'color' | 'warrantyDays' | 'suggestedPriceInCents'> & {
    /** Rótulos dos meta fields do TIPO do produto (ex.: só Celular tem IMEI). */
    typeFields?: string[]
  }
  purchase: { id: string; date: string; marketplace: string | null }
  sale?: { id: string; customerId: string; customerName: string } | null
}

export interface SaleItem {
  id: string
  unitId: string
  nameSnapshot: string
  priceInCents: number
  discountInCents: number
  costSnapshotInCents: number
  warrantyDays: number | null
  warrantyUntil: string | null
}

// Item de venda na visão pública (whitelist — nunca custo/lucro).
export interface PublicSaleItem {
  name: string
  warrantyUntil: string | null
}

export interface UserOption {
  id: string
  kind: UserOptionKind
  label: string
  /** Metadado opcional — ex.: modo de cálculo de um formato customizado (MILES). */
  meta?: string | null
}

export interface PendingPanel {
  products: {
    purchaseId: string
    productName: string
    marketplace: string | null
    quantity: number
    expectedAt: string | null
    daysLate: number
    valueInCents: number
  }[]
  credits: {
    purchaseId: string
    productName: string
    format: PurchaseFormat
    formatLabel: string | null
    expectedAt: string | null
    daysLate: number
    expectedCreditInCents: number
  }[]
  /** Vendas sem produto do sistema vinculado (obrigação de registrar). */
  noProduct: {
    saleId: string
    customerId: string
    customerName: string
    description: string | null
    saleDate: string
    valueInCents: number
  }[]
  /** Vendas a prazo ("casada"/fiado) com saldo em aberto. */
  payments: {
    saleId: string
    customerId: string
    customerName: string
    description: string | null
    balanceInCents: number
    nextDueDate: string | null
    daysLate: number
  }[]
  stats: {
    receivedCount: number
    pendingProductsCount: number
    pendingProductsValueInCents: number
    creditedCount: number
    creditedValueInCents: number
    pendingCreditsCount: number
    pendingCreditsValueInCents: number
    noProductCount: number
    pendingPaymentsCount: number
    pendingPaymentsValueInCents: number
    overduePaymentsValueInCents: number
  }
}

// Bloco "loja" do dashboard (aditivo).
export interface LojaDashboard {
  investedInCents: number
  monthlyProfit: { month: string; profitInCents: number; marginPercent: number | null }[]
  pending: PendingPanel['stats']
}
