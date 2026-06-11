# Data Model — Página pública do devedor (023)

Uma tabela nova + um campo opcional no `User`. Os demais dados são derivados (read-only) dos modelos
existentes (Sale, Installment, Receipt, PixKey).

## Servidor (Postgres / Prisma)

### SaleShareLink (tabela nova)

Link compartilhável de **uma** venda.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String (uuid) | PK |
| `token` | String | **único**, aleatório (`base64url`, 32 bytes) |
| `saleId` | String | FK → Sale, **único** (1 link por venda), `onDelete: Cascade` |
| `revoked` | Boolean | default `false` |
| `expiresAt` | DateTime? | opcional; passado = expirado |
| `createdAt` | DateTime | default now |

**Estados derivados**: `ativo` (não revogado e não expirado) · `revogado` · `expirado` ·
`inexistente`. Regenerar = rotaciona `token`, zera `revoked` e `expiresAt`.

**Validade (acesso público)**: válido ⇔ existe ∧ `!revoked` ∧ (`expiresAt` nulo ∨ `expiresAt` > agora).
Qualquer outro caso → 404 genérico.

### User (campo adicionado)

| Campo | Tipo | Notas |
|---|---|---|
| `contactPhone` | String? | telefone do credor p/ o devedor (WhatsApp). Opcional. |

## DTO público (derivado, read-only) — `serializePublicSale`

Whitelist explícita. **Não** faz spread do `sale`.

```text
PublicSaleView {
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
    status: 'PAID' | 'PARTIAL' | 'OPEN'
    overdue: boolean
    balanceInCents: number
  }[]
  receipts: {
    receivedAt: Date
    amountInCents: number
    methods: string[]
    attachments: { path: string; method?: string | null }[]
    receiptPath: string | null
  }[]
  pix?: { type: string; key: string; holderName: string; bankName: string }   // chave PIX padrão
  contact?: { phone: string; whatsappUrl: string }                            // se User.contactPhone
}
```

**Excluído de propósito** (FR-009/NFR-002): `productCostInCents`, `profitInCents`,
`productValueInCents`, `userId`/ids internos, e tudo de outras vendas/clientes.

## Reuso

- `allocateReceipts` / lógica do `serializeSale` → `totalPaidInCents`, `balanceInCents`, status das
  parcelas (FR-010, consistência com a visão interna).
- `pixKeysRepository.findDefaultByUserId(ownerId)` → `pix`.
- `buildWhatsappUrl` → `contact.whatsappUrl` a partir de `User.contactPhone`.
- `/comprovantes/:key` (rota pública existente) → exibição/download dos anexos.
