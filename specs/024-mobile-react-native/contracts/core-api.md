# Contract — `@pindurados/core` (pacote compartilhado)

TS puro, **sem deps de plataforma** (sem DOM, RN ou Node-only). Consumido por `api/`, `web/` e `mobile/`. Origem do código: `api/src/use-cases/calculate-sale.ts`, `api/src/utils/allocate-receipts.ts`, `web/src/lib/{utils,masks}.ts`, `web/src/api/types.ts`.

## Subpacotes / exports

### `@pindurados/core/calc`
- `calculateSale(input): CalculationResult` — total, juros, parcelas, lucro; suporta modos AUTOMATIC/MANUAL/BY_TOTAL e valores custom. (Espelha `api/src/use-cases/calculate-sale.ts`.)
- `redistribute(cents: number[], pinned: boolean[], target: number): number[]` — redistribui o restante nas parcelas não fixadas (a quebra vai na última). (Espelha `web/new-sale`.)
- `allocateReceipts(sale, installments, receipts, today): AllocationResult` — abate recebimentos (positivos − estornos) nas parcelas mais antigas; devolve por parcela `paidInCents`, `balanceInCents`, `status`, `overdue`, `effectiveInCents` e o saldo da venda. (Espelha `api/src/utils/allocate-receipts.ts`.)
- `addMonthsISO(iso, months): string` — vencimentos mensais preservando o dia.

### `@pindurados/core/format`
- `formatCurrency(cents: number): string` → "R$ 1.234,56" (Intl pt-BR).
- `formatDate(iso): string` → "DD/MM/YYYY".
- `reaisToCents(value): number`, `digitsToCents(s): number`, `centsToDisplay(cents): string`, `formatPhone(s): string`. (Espelha `web/src/lib/{utils,masks}.ts`.)

### `@pindurados/core/types`
- Tipos do domínio: `Sale`, `Installment`, `Receipt`, `ReceiptAttachment`, `ReceiptMethod`, `PixKey`, `PixKeyType`, `SaleType`, `InstallmentStatus`, `CalculationResult`, `CalculateBody`. (Espelha `web/src/api/types.ts`.)

## Garantias / testes

- **Paridade (NON-NEGOTIABLE)**: o teste de paridade que hoje vive em `api/` (mesmos casos de juros/parcelas/alocação) passa a viver **só** aqui. Web e mobile, usando o core, produzem resultados idênticos ao `api/` — **0 divergência de centavos** (SC-003/005).
- **Pureza**: nenhuma função acessa rede, disco, DOM ou APIs de RN. Entrada → saída determinística.
- **Retrocompat**: `api/` e `web/` reexportam do core; imports atuais (`@/lib/utils`, `@/utils/allocate-receipts`) seguem funcionando. Suítes existentes validam zero regressão.
</content>
