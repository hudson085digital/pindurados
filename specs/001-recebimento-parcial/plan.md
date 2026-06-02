# Implementation Plan: Recebimento Manual e Pagamento Parcial

**Spec**: [spec.md](./spec.md) · **Branch**: `001-recebimento-parcial` · **Data**: 2026-06-01

## Decisão de arquitetura

O sistema atual modela pagamento como `Payment` **amarrado a uma parcela**
(`installmentId`). A spec exige recebimento no nível do **crediário (Sale)** como
evento imutável, com alocação **derivada**. Portanto:

- Introduzir o model **`Receipt`** (recebimento) ligado a `Sale` — fonte única da
  verdade sobre dinheiro recebido. Substitui o model `Payment`.
- A alocação por parcela (quanto cada parcela recebeu, status, saldo) passa a ser
  **calculada** por um motor puro `allocate-receipts`, consumido por `serialize-sale`.
- Mantém o *shape* de saída de `serialize-sale` (parcelas com `paidInCents`, `status`,
  `balanceInCents`), então o restante da API/front continua funcionando.

Stack: Fastify + Prisma (arquitetura Rocketseat: use-cases + repositories + factories
+ controllers). Dinheiro em **centavos (Int)**. Testes em Vitest com repositórios
**in-memory** (sem DB).

## Regras incorporadas das clarifications

- **Q1** — dentro de uma parcela em atraso, o recebimento abate **multa+juros antes do
  principal** (motor calcula o breakdown `latePaid`/`principalPaid`).
- **Q2** — recebimento é **limitado ao saldo**; sem crédito a favor. Estorno via
  recebimento negativo.

## Entidades / Schema (Prisma)

- `enum ReceiptMethod { PIX, CASH }`
- `model Receipt`: `amountInCents` (negativo = estorno), `method`, `receivedAt`,
  `note?`, `receiptPath?`, `reversesReceiptId?` (link do estorno→original),
  `createdBy?` (auditoria), `createdAt`, `saleId`.
- `Sale` ganha `receipts Receipt[]`; `Installment` perde `payments`; `Payment` é
  removido.

## Motor de alocação (`utils/allocate-receipts.ts`)

Entrada: parcelas ordenadas (principal + lateInterest quando `isLate`) e a soma dos
recebimentos (pool). Cascata da mais antiga p/ mais nova; dentro de cada parcela em
atraso, preenche multa+juros e depois principal. Saída por parcela:
`latePaidInCents`, `principalPaidInCents`, `paidInCents`, `balanceInCents`, `status`
(`PAID`/`PARTIAL`/`OPEN`), além de `totalReceived` e `saleBalance`.

## Use cases

- `create-receipt` — valida posse (via Sale→Customer→userId), `amount>0`, limita ao
  saldo (FR-015), cria recebimento.
- `void-receipt` — estorno: cria recebimento negativo ligado ao original; impede
  estornar estorno ou estornar duas vezes (FR-009/010).
- `fetch-receipts` — extrato por crediário (FR-012).
- Ajuste em `mark-installment-late` — base do juros usa o **principal em aberto**
  (reduzido por adiantamentos) → FR-011.
- Remove `pay-installment` (substituído).

## Camadas

- Repos: `receipts-repository` (interface) + `prisma/` + `in-memory/`. `SalesRepository`
  include muda `payments`→`receipts`.
- Erros: novo `BusinessRuleError` (HTTP 400) p/ saldo excedido / estorno inválido.
- Controllers/rotas (em `sales/`): `POST /sales/:saleId/receipts`,
  `GET /sales/:saleId/receipts`, `POST /sales/:saleId/receipts/:receiptId/void`.
  Remove `POST /installments/:id/payments`.

## Front (web)

- `types.ts`: `Payment`→`Receipt`; `Sale.receipts`.
- `api/receipts.ts`: `createReceipt`, `voidReceipt` (extrato vem embutido na Sale).
- `customer-details.tsx`: botão **Registrar recebimento** no nível da venda (valor,
  forma Pix/Dinheiro, data, observação) + **extrato** com botão de estorno. Linhas de
  parcela seguem mostrando status/saldo derivados. Mantém marcar/tirar atraso.

## Testes / verificação

- Vitest: `allocate-receipts.spec` (cascata, parcial, multa+juros primeiro, estorno,
  limite), `create-receipt.spec`, `void-receipt.spec`, `serialize-sale.spec`.
- `pnpm test` (API) verde; `pnpm build` (web, tsc) sem erros de tipo.
- DB: migration aplicada via `prisma migrate` quando o Postgres subir; `prisma generate`
  para os tipos.
</content>
