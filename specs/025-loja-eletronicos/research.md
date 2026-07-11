# Research — 025 Loja de Eletrônicos

Decisões da Fase 0. Fontes: `casos-de-uso.md`, planilha "Compras de Produtos -
Milhas - 2026.xlsx" (abas Janeiro–Junho analisadas), telas do Mercado Phone
(`screenshots/`), schema/uso-cases atuais da API.

## 1. Custo efetivo da compra (a conta da planilha)

**Decision**: reproduzir a matemática da planilha, em centavos:

- `paidWithFreight = quantity × unitValue + freight`
- **Milhas**: `milesExpected = paidWithFreight(reais) × accrualPerReal`;
  `milesValue = milesExpected ÷ 1000 × cpm`; `finalCost = paidWithFreight −
  milesValue` (CPM em centavos por milheiro, editável por compra; ex.: CPM
  R$ 27,00 → 15.457,8 milhas valem R$ 417,36 — bate com a planilha).
- **Cashback**: `cashbackValue = paidWithFreight × cashbackPercent%`;
  `finalCost = paidWithFreight − cashbackValue` (ex.: 13% de R$ 4.708,90 →
  R$ 610,87 ✅).
- **Nubank antecipação**: quando marcada, `finalCostNubank = finalCost × (1 −
  4,5%)` (percentual configurável por compra; default 4,5).
- Custo **unitário** = finalCost ÷ quantity (sobra de centavos na 1ª unidade).

**Rationale**: os números de teste extraídos das abas reais conferem centavo a
centavo (SC-001). Cálculo puro em `purchase-cost.ts` com spec dedicado.

**Alternatives considered**: guardar só o custo digitado (perderia a auditoria
esperado × real das milhas); Float em reais (viola a convenção de centavos).

## 2. Esperado vs. real das milhas/cashback

**Decision**: a compra guarda o valor **esperado** (calculado) e, ao confirmar
o crédito, o valor **real** (editável). Unidades **não vendidas** têm o custo
recalculado com o real; unidades vendidas mantêm o snapshot em `SaleItem` (a
venda não muda depois de feita).

**Rationale**: espelha o fluxo da planilha (colunas de previsão/recebido) e a
assumption da spec; histórico imutável de vendas.

## 3. Estoque por unidade serializada

**Decision**: `StockUnit` é 1 peça física com status `AWAITING → AVAILABLE →
SOLD` (+ volta para `AVAILABLE` se a venda for excluída). Compra com
`quantity=N` gera N unidades. SN/IMEI/DANFE ficam na unidade.

**Rationale**: é como a planilha funciona (uma linha por peça, cada uma com seu
SN/IMEI); vender "a unidade X por IMEI" exige isso; garantia é por unidade.

**Alternatives considered**: estoque por quantidade agregada (perde SN/IMEI e
custo distinto por unidade — inviável para o negócio real).

## 4. O plug na venda (fiado intocado)

**Decision**: venda com itens preenche os campos **que já existem** —
`productValueInCents` e `productCostInCents` — e o restante do sistema
(parcelas, juros, `profitInCents`, dashboard, página pública) não muda uma
linha de semântica. `marginPercent`/`markupPercent` são derivados no
serializer: `margin = profit ÷ (downPayment + total)`, `markup = profit ÷
cost`.

**Rationale**: pedido explícito do dono ("só plugar, não mudar nada"); menor
superfície de risco; vendas antigas ganham margem/mark-up de graça (já têm
custo manual).

## 5. Listas configuráveis (CIA e origem da venda)

**Decision**: tabela única `UserOption { kind: MARKETPLACE | SALE_ORIGIN,
label }` com seed inicial (Mercado Livre, Shopee, Amazon, Magalu, FastShop,
Esfera; Cliente recorrente, Indicação, Parceria, Tráfego pago, Tráfego
orgânico). `Purchase.marketplace` e `Sale.origin` guardam o **label como
string** (não FK) — apagar uma opção não afeta registros passados.

**Rationale**: mesma filosofia de texto-livre da planilha (coluna Conta);
configurável sem acoplamento.

## 6. Importação da planilha

**Decision**: endpoint de upload que aceita o `.xlsx` real, lendo com `xlsx`
(SheetJS, mesma lib usada nos scripts do repo) e mapeando os dois layouts de
cabeçalho encontrados (Jan–Mar sem coluna Quantidade; Abr–Jun com Quantidade e
Banco/Cartão). Datas `dd/mm/yyyy` e `d/m/yyyy`; moeda "R$ 1.234,56" e
"R$ 1,234.56" (formato US da planilha); "Dados do Produto" é parseado por
regex (`SN:`, `IMEI:`, `IMEI2:`, `DANFE:`) para preencher as unidades. Linhas
inválidas não abortam a importação — voltam num relatório com motivo.

**Rationale**: FR-022/SC-007 (≥95% importado); os dois layouts foram
verificados na planilha real.

**Alternatives considered**: CSV manual (mais atrito); importar no front
(arquivo grande + validação de negócio pertence à API).

## 7. Navegação no web

**Decision**: bottom nav vira Resumo · Devedores · Nova venda · **Loja** · Pix;
"Loja" abre segmentos internos (Compras | Estoque | Produtos) na mesma página
com sub-rotas.

**Rationale**: 44px de alvo com 5 itens ainda confortável em 390px; agrupa o
mundo novo sem mexer nas rotas atuais.

## 8. Pendências

**Decision**: painel derivado por consulta (sem estado novo): produto pendente
= compra ativa sem `productReceivedAt`; crédito pendente = formato
milhas/cashback sem `creditReceivedAt`. "Atrasado" = previsão < hoje. Exposto
em `/reports/pending` e resumido no dashboard.

**Rationale**: status derivado elimina inconsistência (mesma filosofia do
`allocate-receipts` existente).
