# Data Model — 025 Loja de Eletrônicos

Migração Prisma **aditiva** (tabelas novas + colunas opcionais). Dinheiro em
centavos (Int); percentuais Float. Nada existente muda de tipo ou semântica.

## Novos enums

```prisma
enum ProductType {
  DEVICE      // aparelho (iPhone, TV, JBL…)
  ACCESSORY   // acessório (fonte, película…)
  PART        // peça
  OTHER
}

enum PurchaseFormat {
  NORMAL
  PROMO
  MILES
  CASHBACK
}

enum StockUnitStatus {
  AWAITING    // comprado, não recebido
  AVAILABLE   // em estoque
  SOLD        // vendido (volta a AVAILABLE se a venda for excluída)
}

enum CustomerKind {
  FINAL
  RESALE
}

enum SaleDeliveryType {
  PICKUP      // retirada
  DELIVERY    // entrega
  MAIL        // correios
}

enum UserOptionKind {
  MARKETPLACE
  SALE_ORIGIN
}
```

## Novas tabelas

### ProductType / ProductModel / ProductTypeField — catálogo estruturado

Revisão de 10/07/2026 (pedido do Hudson): tipo de produto é **entidade**
(Celular, Caixa de Som, Ar-condicionado…), modelo é **entidade associada ao
tipo** (Boombox 4 → Caixa de Som) e os **meta fields pertencem ao tipo**
(Celular → IMEI, IMEI 2, GB, Saúde/Ciclo da bateria); valores preenchidos vão
no `meta` (JSONB) do produto — sem colunas vazias. Campos universais do
produto: marca, cor, categoria, subcategoria (listas UserOption) + SKU e
código de barras (texto). Nome sugerido = marca + modelo + cor.

### Product — catálogo (agrupa unidades pelo modelo)

| Campo | Tipo | Regra |
|---|---|---|
| id | uuid PK | |
| userId | FK User | cascade |
| name | String | obrigatório (ex.: "JBL Boombox 4 Preta") |
| brand | String? | |
| type | ProductType | default OTHER |
| suggestedPriceInCents | Int? | preço de venda sugerido |
| warrantyDays | Int? | dias de garantia dados ao comprador |
| minQuantity | Int? | alerta de reposição quando disponíveis < min |
| note | String? | |
| createdAt | DateTime | |

### Purchase — compra em marketplace (1 linha da planilha)

| Campo | Tipo | Regra |
|---|---|---|
| id | uuid PK | |
| userId | FK User | cascade |
| productId | FK Product | restrict (compra referencia o modelo) |
| date | DateTime | obrigatório |
| orderNumber | String? | nº do pedido |
| account | String? | conta usada (CPF/e-mail/nome — texto livre) |
| marketplace | String? | CIA (label de UserOption, guardado como string) |
| format | PurchaseFormat | default NORMAL |
| quantity | Int | ≥1, default 1 |
| unitValueInCents | Int | obrigatório |
| freightInCents | Int | default 0 |
| paymentMethod | String? | pix/cartão/…texto |
| bankCard | String? | banco/cartão |
| accrualPerReal | Float? | milhas por real (formato MILES) |
| cpmInCents | Int? | custo do milheiro (formato MILES) |
| cashbackPercent | Float? | % (formato CASHBACK) |
| expectedCreditInCents | Int | calculado (valor esperado de milhas/cashback), default 0 |
| actualCreditInCents | Int? | valor real creditado (confirmação) |
| nubankAdvance | Boolean | default false |
| nubankDiscountPercent | Float | default 4.5 |
| productExpectedAt | DateTime? | previsão de recebimento |
| productReceivedAt | DateTime? | recebimento real (status derivado) |
| creditExpectedAt | DateTime? | previsão do crédito |
| creditReceivedAt | DateTime? | crédito real (status derivado) |
| note | String? | observação / palavra-chave |
| canceled | Boolean | default false |
| createdAt | DateTime | |

Derivados (serializer, nunca gravados): `paidWithFreightInCents`,
`finalCostInCents`, `finalCostNubankInCents`, `unitFinalCostInCents`,
`productStatus` (NOT_RECEIVED/RECEIVED/LATE), `creditStatus`
(NOT_CREDITED/CREDITED/LATE/N_A).

### StockUnit — peça física

| Campo | Tipo | Regra |
|---|---|---|
| id | uuid PK | |
| userId | FK User | cascade |
| purchaseId | FK Purchase | cascade (cancelar compra remove unidades não vendidas — use-case valida) |
| productId | FK Product | restrict |
| status | StockUnitStatus | default AWAITING; → AVAILABLE no recebimento; → SOLD na venda |
| finalCostInCents | Int | custo efetivo unitário (snapshot; recalculado no crédito real só se ≠ SOLD) |
| serialNumber | String? | |
| imei1 | String? | |
| imei2 | String? | |
| danfe | String? | |
| note | String? | |
| createdAt | DateTime | |

### SaleItem — unidade vendida numa venda (o plug)

| Campo | Tipo | Regra |
|---|---|---|
| id | uuid PK | |
| saleId | FK Sale | cascade |
| unitId | FK StockUnit @unique | 1 unidade só pode estar em 1 venda |
| nameSnapshot | String | nome do produto no momento |
| priceInCents | Int | preço praticado |
| discountInCents | Int | default 0; ≤ price |
| costSnapshotInCents | Int | custo efetivo no momento |
| warrantyDays | Int? | copiado do produto |
| warrantyUntil | DateTime? | saleDate + warrantyDays |
| createdAt | DateTime | |

### UserOption — listas configuráveis

| Campo | Tipo | Regra |
|---|---|---|
| id | uuid PK | |
| userId | FK User | cascade |
| kind | UserOptionKind | |
| label | String | @@unique(userId, kind, label) |
| createdAt | DateTime | |

## Colunas aditivas em tabelas existentes

### Customer (todas opcionais)

`kind CustomerKind?` · `cpfCnpj String?` · `instagram String?` ·
`tags String[] @default([])` · `addressZip/addressStreet/addressNumber/
addressDistrict/addressCity/addressState/addressComplement String?`

### Sale (todas opcionais — o fiado não muda)

`origin String?` (origem da venda) · `deliveryType SaleDeliveryType?` ·
relação `items SaleItem[]`

## Invariantes (validadas nos use-cases)

1. Unidade `SOLD` não entra em outra venda (`unitId @unique` + checagem).
2. Excluir venda → itens removidos e unidades de volta a `AVAILABLE`.
3. Cancelar compra bloqueado se alguma unidade dela está `SOLD`.
4. Venda com itens: `productCostInCents = Σ costSnapshot`; se
   `productValueInCents` não vier, `= Σ (price − discount)`.
5. Crédito real confirmado → recalcula `finalCostInCents` apenas das unidades
   não vendidas da compra.
6. Nenhum valor de estoque/custo aparece no serializer público.
