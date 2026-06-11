# Contract — Camada de dados local (mobile)

Repositórios sobre SQLite (`expo-sqlite`) que reaplicam, **no aparelho**, as operações antes feitas pelos use-cases do `api/`. Derivações (status/saldo) via `@pindurados/core`. Toda escrita é transacional. IDs são uuid gerados no device. Datas ISO.

## `customersRepo`
- `list(): CustomerWithBalance[]` — devedores + saldo derivado (verde/vermelho).
- `get(id): CustomerDetail` — devedor + vendas (cada uma já derivada: parcelas/recebimentos/saldo).
- `create(input)`, `update(id, patch)`, `remove(id)` (cascade nas vendas).
- `setAutoReminder(id, bool)`.

## `salesRepo`
- `create(input)`: valida, `calculateSale` (core), persiste `sale` + `installments` em transação.
- `update(id, patch)`: edita descrição/custo/data; **reparcelar** = recria parcelas a partir de valores custom (core `redistribute`) preservando o que já foi recebido.
- `remove(id)`.
- `chargeMessage(id): { message, whatsappUrl? }` — monta a mensagem (mesma do web) com a chave Pix padrão e o telefone do devedor.

## `receiptsRepo`
- `create(input)`: valida valor ≤ saldo; se 2+ formas, exige soma por forma = total; grava `receipt` (evento) + `receipt_attachments` (arquivos já salvos no FileSystem). Status/saldo recalculados na leitura (core).
- `void(receiptId)`: cria evento de **estorno** (valor negativo apontando ao original); não apaga histórico.
- `update(receiptId, patch)`: edita valor/formas/data/observação; adiciona comprovantes.
- `addAttachment(receiptId, file)`, `getAttachmentUri(path)` (para abrir/compartilhar).

## `installmentsRepo`
- `markLate(id, { lateFeePercent, reason })`, `unmarkLate(id)`.
- `updateDueDate(id, dueDate)`.

## `pixKeysRepo`
- `list()`, `create(input)` (primeira vira padrão), `setDefault(id)`, `remove(id)`.

## `settingsRepo`
- `get()`, `update({ ownerName?, contactPhone?, defaultLateFeePercent? })`, `touchLastBackup()`.

## `dashboardRepo`
- `summary(): DashboardData` — a receber, recebido, lucro previsto, parcelas vencidas, recebido por mês, por forma, top devedores, próximos vencimentos, contadores (mesmos indicadores do web), agregando localmente.

## Garantias
- **Offline**: nenhuma operação faz rede.
- **Ledger imutável**: recebimentos nunca são apagados (estorno é novo evento).
- **Derivação única**: status/saldo sempre via `@pindurados/core` (sem coluna mutável de status).
- **Integração React Query**: cada método vira `queryFn`/mutation; chaves de query por entidade (`['customers']`, `['customer', id]`, `['dashboard']`, `['pix-keys']`).
</content>
