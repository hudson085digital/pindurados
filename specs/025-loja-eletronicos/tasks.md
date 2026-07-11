# Tasks: Adaptação para Loja de Eletrônicos

**Input**: Design documents from `/specs/025-loja-eletronicos/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Organization**: tarefas agrupadas por user story (spec.md). O fiado existente
não muda — toda integração é aditiva (ver plan.md "Decisões de integração").

## Phase 1: Setup

- [X] T001 Adicionar enums e modelos novos (Product, Purchase, StockUnit, SaleItem, UserOption) + colunas opcionais em Customer/Sale em `api/prisma/schema.prisma` conforme `data-model.md`
- [X] T002 Rodar `pnpm prisma migrate dev --name loja-eletronicos` (migração aditiva) em `api/`
- [X] T003 [P] Adicionar dependência `xlsx` na API (`api/package.json`) para importação da planilha
- [X] T004 [P] Estender tipos compartilhados em `packages/core/src/types/index.ts` (ProductType, PurchaseFormat, StockUnitStatus, CustomerKind, SaleDeliveryType, DTOs de Product/Purchase/StockUnit/SaleItem e campos novos de Customer/Sale)

## Phase 2: Foundational (bloqueia as user stories)

- [X] T005 Criar cálculo puro do custo efetivo em `api/src/use-cases/purchase-cost.ts` (paidWithFreight, milhas esperadas via acúmulo×CPM, cashback %, desconto Nubank, custo unitário com sobra de centavos na 1ª unidade) conforme `research.md` §1
- [X] T006 Criar `api/src/use-cases/purchase-cost.spec.ts` com os casos reais da planilha (Milhas: 2.576,30/6/CPM 27 → 2.158,94 · Cashback: 4.699,00+9,90/13% → 4.098,03 · Normal → custo = pago)
- [X] T007 [P] Criar contratos e repositórios Prisma: `api/src/repositories/{products,purchases,stock-units,user-options}-repository.ts` + `api/src/repositories/prisma/prisma-{products,purchases,stock-units,user-options}-repository.ts`
- [X] T008 [P] Criar repositórios in-memory correspondentes em `api/src/repositories/in-memory/` para testes
- [X] T009 [P] Criar controller de opções configuráveis (GET/POST/DELETE `/options`, kinds MARKETPLACE e SALE_ORIGIN, seed dos labels iniciais no primeiro GET) em `api/src/http/controllers/options/` e registrar em `api/src/app.ts`
- [X] T010 [P] Criar clients web `web/src/api/{products,purchases,stock,options}.ts` com os tipos do core
- [X] T011 Adicionar aba **Loja** ao bottom nav em `web/src/pages/_layouts/app.tsx` e criar rota/página `web/src/pages/app/loja/index.tsx` com segmentos internos (Compras | Estoque | Produtos) registrados em `web/src/routes.tsx`

**Checkpoint**: cálculo de custo testado, repositórios e navegação prontos — user stories podem começar.

## Phase 3: User Story 1 — Registrar compras (P1) 🎯 MVP

**Goal**: a planilha vira sistema — compras com custo efetivo calculado, unidades geradas, investimento do mês e importação do histórico.

**Independent Test**: cadastrar compras nos 4 formatos e conferir custo final (centavo a centavo com a planilha), lista filtrada por mês com total investido, importação do `.xlsx` real.

- [X] T012 [US1] Use-cases de produto (`create-product.ts`, `update-product.ts`, `delete-product.ts` bloqueando com unidades, `fetch-products.ts` com contagens) em `api/src/use-cases/`
- [X] T013 [US1] Use-cases de compra (`create-purchase.ts` gerando N StockUnits AWAITING com custo unitário, `update-purchase.ts` recalculando unidades não vendidas, `cancel-purchase.ts` com 409 se unidade vendida, `fetch-purchases.ts` com filtros + investedInCents) em `api/src/use-cases/`
- [X] T014 [US1] Use-cases de ciclo da compra: `receive-purchase-product.ts` (data + SN/IMEI/DANFE por unidade → AVAILABLE) e `confirm-purchase-credit.ts` (data + valor real → recalcula custo das unidades não vendidas) em `api/src/use-cases/`
- [X] T015 [US1] Spec de integração `api/src/use-cases/create-purchase.spec.ts` (unidades geradas, custos, cancelamento bloqueado, recálculo no crédito real) com repos in-memory
- [X] T016 [US1] Controllers + rotas `api/src/http/controllers/purchases/` (POST/GET/PUT/DELETE `/purchases`, PATCH `/purchases/:id/receive`, PATCH `/purchases/:id/credit`) e `api/src/http/controllers/products/` (CRUD `/products`), registrados em `api/src/app.ts`
- [X] T017 [US1] Use-case `import-purchases.ts` + spec: parse dos 2 layouts da planilha (Jan–Mar e Abr–Jun), datas dd/mm/yyyy, moeda US "R$ 1,234.56", regex de Dados do Produto (SN/IMEI/IMEI2/DANFE), relatório `{ imported, skipped[] }` em `api/src/use-cases/`
- [X] T018 [US1] Controller multipart POST `/purchases/import` em `api/src/http/controllers/purchases/import.ts`
- [X] T019 [US1] Página `web/src/pages/app/loja/produtos.tsx`: lista com busca/contagens/alerta de mínimo + dialog de criar/editar produto
- [X] T020 [US1] Página `web/src/pages/app/loja/compras.tsx`: lista filtrada (mês/CIA/formato/status) com total investido, form de compra com cálculo do custo final ao vivo (formatos Normal/Promoção/Milhas/Cashback + opção Nubank), ações receber/creditar/cancelar
- [X] T021 [US1] Dialog de importação da planilha (upload + relatório imported/skipped) em `web/src/pages/app/loja/compras.tsx`

**Checkpoint**: MVP — a planilha está no sistema com custos corretos.

## Phase 4: User Story 3 — Vender com lucro e margem (P1)

**Goal**: venda escolhe unidades do estoque; lucro/margem/mark-up visíveis na prévia, no detalhe, na lista e no dashboard; fiado intocado.

**Independent Test**: vender unidade com custo conhecido e conferir lucro/margem na prévia e no detalhe; venda por descrição livre continua igual; excluir venda devolve a unidade.

- [X] T022 [US3] Estender `api/src/use-cases/create-sale.ts` com `items?[]` (valida unidade AVAILABLE — ou AWAITING com flag —, cria SaleItems com snapshot nome/custo/garantia + warrantyUntil, marca SOLD, deriva productValue/productCost) mantendo fluxo sem itens intacto + atualizar `create-sale.spec.ts`? (criar `api/src/use-cases/create-sale-items.spec.ts`)
- [X] T023 [US3] Estender `api/src/use-cases/delete-sale.ts` para devolver unidades a AVAILABLE (transação) + spec
- [X] T024 [US3] Expor `items[]`, `marginPercent` e `markupPercent` derivados no serializer de venda (controllers `api/src/http/controllers/sales/details.ts`/`create.ts` e DTO em `packages/core/src/types/index.ts`); aceitar `origin`/`deliveryType` opcionais no POST/PUT `/sales`
- [X] T025 [US3] Estender `api/src/http/controllers/reports/dashboard.ts` com `investedInCents` do mês, `monthlyProfit[{month, profitInCents, marginPercent}]` e contadores de pendências
- [X] T026 [US3] Seção "Itens do estoque" em `web/src/pages/app/new-sale.tsx`: seletor de unidades disponíveis (por produto → unidade SN/IMEI), preço praticado + desconto por item, origem/entrega opcionais, prévia com lucro/margem/mark-up ao vivo
- [X] T027 [US3] Exibir lucro/margem/mark-up + lista de itens (com garantia) no card da venda em `web/src/pages/app/customer-details.tsx`
- [X] T028 [US3] Dashboard `web/src/pages/app/dashboard.tsx`: card investimento do mês + seção lucro/margem por mês
- [X] T029 [US3] Itens com garantia na página pública: whitelist em `api/src/utils/serialize-public-sale.ts` (+`api/src/http/controllers/public/get-public-sale.ts`) e seção no `web/src/pages/public/public-sale.tsx` — nunca custo/lucro

**Checkpoint**: cada venda mostra lucro, margem e mark-up — pedido central atendido.

## Phase 5: User Story 2 — Pendências (P2)

**Goal**: painel do que não chegou e do que não caiu, com atrasados no topo.

**Independent Test**: compras com previsões vencidas aparecem como atrasadas; marcar recebimento/crédito remove da lista.

- [X] T030 [US2] Use-case `pending-panel.ts` (produtos não recebidos + créditos não creditados, valor total, dias de atraso, ordenação) + spec em `api/src/use-cases/`
- [X] T031 [US2] Rota GET `/reports/pending` em `api/src/http/controllers/reports/`
- [X] T032 [US2] Seção/aba de pendências em `web/src/pages/app/loja/compras.tsx` (dois grupos com contagem/valor, ação rápida de marcar recebido/creditado) + card de alerta no dashboard linkando para ela

## Phase 6: User Story 4 — Estoque de unidades (P2)

**Goal**: ver unidades por status, achar por IMEI/SN, editar dados da peça.

**Independent Test**: buscar IMEI real e encontrar unidade com compra de origem e venda ligada; editar SN/DANFE.

- [X] T033 [US4] Use-case `fetch-stock-units.ts` (filtros status/produto/busca SN-IMEI-DANFE, summary por status) e `update-stock-unit.ts` + specs em `api/src/use-cases/`
- [X] T034 [US4] Controllers GET `/stock-units` e PATCH `/stock-units/:id` em `api/src/http/controllers/stock/`
- [X] T035 [US4] Página `web/src/pages/app/loja/estoque.tsx`: resumo por status, lista com busca por IMEI/SN/DANFE, link para compra de origem e venda, edição de dados da unidade

## Phase 7: User Story 5 — Cliente enriquecido (P3)

**Goal**: tipo final/revenda, CPF/CNPJ, endereço, Instagram, tags — tudo opcional.

**Independent Test**: salvar cliente só com nome (como hoje); filtrar por tipo; buscar por CPF/tag.

- [X] T036 [US5] Estender use-cases/controllers de customers (create/update com campos novos; fetch com busca por cpf/tag e filtro kind) em `api/src/use-cases/` e `api/src/http/controllers/customers/`
- [X] T037 [US5] Form de devedor com seção colapsável "Mais dados" (tipo, CPF/CNPJ com aviso não bloqueante, endereço, Instagram, tags) em `web/src/pages/app/customers.tsx` + exibição no detalhe `web/src/pages/app/customer-details.tsx` + filtro por tipo na lista

## Phase 8: Polish & verificação

- [X] T038 Rodar `cd api && pnpm test` (todos os specs, incl. casos da planilha) e `cd web && pnpm build` limpos
- [X] T039 Verificação e2e visual (Playwright headless): fluxo do quickstart.md — compra Milhas → receber → vender → lucro/margem → pendências → página pública — com screenshots claro/escuro
- [X] T040 Importar a planilha real "Compras de Produtos - Milhas - 2026.xlsx" no banco local e conferir SC-007 (≥95% importado) e investimento mensal contra a planilha
- [X] T041 [P] Atualizar `COMO-USAR.md` (seções Loja: produtos, compras, estoque, pendências, importação) e `PRODUCT.md` (escopo loja de eletrônicos)

## Dependencies

- Phase 1 → Phase 2 → user stories.
- **US1 (Phase 3)** não depende de outra story.
- **US3 (Phase 4)** depende de US1 (precisa de unidades em estoque).
- **US2 (Phase 5)** depende de US1 (usa previsões/datas da compra).
- **US4 (Phase 6)** depende de US1; enriquecida por US3 (venda ligada).
- **US5 (Phase 7)** independente (só Phase 2).
- Phase 8 depende de todas.

## Parallel Execution Examples

- Phase 1: T003 ∥ T004 (arquivos distintos) após T001–T002.
- Phase 2: T007 ∥ T008 ∥ T009 ∥ T010 após T005–T006.
- Phase 3: T012 ∥ T013 (use-cases distintos); T019 ∥ T020 após T016.
- US5 (T036–T037) pode rodar em paralelo com US2/US4.

## Implementation Strategy

MVP = Phase 1–3 (US1): a planilha vira sistema com custos corretos. Em seguida
Phase 4 (US3) entrega o pedido central (lucro/margem por venda). Depois
pendências (US2), estoque (US4), cliente (US5) e o polish com verificação
e2e + importação da planilha real.
