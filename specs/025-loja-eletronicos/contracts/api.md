# Contratos de API — 025 Loja de Eletrônicos

Todas as rotas novas exigem JWT (padrão atual). Valores em centavos.
Rotas existentes só ganham campos **aditivos** — nenhum contrato atual quebra.

## Produtos

| Método | Rota | Corpo / Query | Resposta |
|---|---|---|---|
| POST | `/products` | `{ name, brand?, type?, suggestedPriceInCents?, warrantyDays?, minQuantity?, note? }` | `{ product }` |
| GET | `/products` | `?search=` (nome/marca) | `{ products: [ { …, availableCount, awaitingCount, belowMin } ] }` |
| PUT | `/products/:id` | mesmos campos | `{ product }` |
| DELETE | `/products/:id` | — | 204 (bloqueia se houver unidades) |

## Compras

| Método | Rota | Corpo / Query | Resposta |
|---|---|---|---|
| POST | `/purchases` | `{ productId, date, quantity?, unitValueInCents, freightInCents?, orderNumber?, account?, marketplace?, format?, paymentMethod?, bankCard?, accrualPerReal?, cpmInCents?, cashbackPercent?, nubankAdvance?, nubankDiscountPercent?, productExpectedAt?, creditExpectedAt?, note? }` | `{ purchase }` com derivados (`finalCostInCents`, `unitFinalCostInCents`, statuses) — cria N `StockUnit` AWAITING |
| GET | `/purchases` | `?month=YYYY-MM&marketplace=&format=&productStatus=&creditStatus=&search=&page=` | `{ purchases, investedInCents, total, page }` |
| PUT | `/purchases/:id` | campos editáveis | `{ purchase }` (recalcula custo das unidades não vendidas) |
| PATCH | `/purchases/:id/receive` | `{ receivedAt, units?: [{ unitId, serialNumber?, imei1?, imei2?, danfe? }] }` | `{ purchase }` — unidades → AVAILABLE |
| PATCH | `/purchases/:id/credit` | `{ creditedAt, actualCreditInCents? }` | `{ purchase }` — recalcula custo das unidades não vendidas |
| DELETE | `/purchases/:id` | — | 204 (cancela; 409 se houver unidade vendida) |
| POST | `/purchases/import` | multipart `.xlsx` | `{ imported, skipped: [{ line, sheet, reason }] }` |

## Estoque

| Método | Rota | Corpo / Query | Resposta |
|---|---|---|---|
| GET | `/stock-units` | `?status=&productId=&search=` (SN/IMEI/DANFE/nome) | `{ units: [{ …, product, purchase: { date, marketplace }, sale?: { id, customerName } }], summary: { awaiting, available, sold, costInCents por status } }` |
| PATCH | `/stock-units/:id` | `{ serialNumber?, imei1?, imei2?, danfe?, note? }` | `{ unit }` |

## Opções configuráveis

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/options?kind=MARKETPLACE\|SALE_ORIGIN` | — | `{ options }` |
| POST | `/options` | `{ kind, label }` | `{ option }` |
| DELETE | `/options/:id` | — | 204 (não afeta registros passados) |

## Rotas existentes — extensões aditivas

### `POST /sales` e `PUT /sales/:id`

Corpo ganha opcionais: `items?: [{ unitId, priceInCents, discountInCents? }]`,
`origin?`, `deliveryType?`. Regras: unidade AVAILABLE (ou AWAITING, com flag
`allowAwaiting: true`); com itens, `productCostInCents` é calculado e
`productValueInCents` defaulta para a soma dos itens. Resposta da venda ganha
`items[]`, `marginPercent`, `markupPercent` (derivados; presentes também nas
vendas antigas quando houver custo).

### `DELETE /sales/:id`

Passa a devolver as unidades dos itens para AVAILABLE (transação).

### `GET /customers` / `POST` / `PUT`

Campos opcionais novos: `kind`, `cpfCnpj`, `instagram`, `tags[]`, endereço
(`addressZip…addressComplement`). `GET /customers?search=` também casa
cpf/tag; `?kind=` filtra.

### `GET /reports/dashboard`

Ganha: `investedInCents` (mês corrente), `monthlyProfit: [{ month,
profitInCents, marginPercent }]`, `pending: { productsCount,
productsValueInCents, creditsCount, creditsValueInCents }`.

### `GET /reports/pending` (nova)

`{ products: [{ purchaseId, product, marketplace, expectedAt, daysLate,
valueInCents }], credits: [{ purchaseId, product, format, expectedAt,
daysLate, expectedCreditInCents }] }` — ordenados por atraso desc.

### `GET /public/sales/:token`

Whitelist ganha `items?: [{ name, warrantyUntil? }]`. **Nunca** custo, lucro,
margem ou dados de compra.
