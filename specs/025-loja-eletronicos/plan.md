# Implementation Plan: Adaptação para Loja de Eletrônicos

**Branch**: `025-loja-eletronicos` | **Date**: 2026-07-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/025-loja-eletronicos/spec.md`

## Summary

Plugar a operação de loja (compras em marketplace com milhas/cashback → estoque
de unidades serializadas → venda com lucro/margem reais) na base existente
**sem alterar o núcleo de fiado**. A ligação é deliberadamente mínima: quando a
venda tem unidades do estoque, o use-case de venda preenche
`productValueInCents` e `productCostInCents` (campos que já existem) a partir
das unidades — parcelas, juros, recebimentos, cobrança, página pública e
relatórios continuam funcionando por cima dos mesmos campos de sempre. Todas as
migrações Prisma são **aditivas** (tabelas novas + colunas opcionais).

## Technical Context

**Language/Version**: TypeScript 5 (Node 20) na API e no web

**Primary Dependencies**: API: Fastify 4 + Prisma + Zod + Vitest (padrão SOLID
do repo: use-cases → repositories → http/controllers, factories). Web: React 18
+ Vite + Tailwind (tokens MOB PHONE) + React Query + React Router + shadcn-style
`components/ui`. Novo: `xlsx` (SheetJS) na API para importar a planilha.

**Storage**: PostgreSQL local (Docker) / Supabase em produção, via Prisma.
Dinheiro sempre em **centavos (Int)**; percentuais Float (convenção do schema).

**Testing**: Vitest na API (`api/src/use-cases/*.spec.ts`, repos in-memory).
Verificação e2e visual via Playwright (dev server + screenshots), como nas
features anteriores.

**Target Platform**: Web app (mobile-first, container 768px). O app Expo (024)
fica para paridade futura.

**Project Type**: web-service (api/) + SPA (web/) em monorepo pnpm.

**Performance Goals**: listas de compras/estoque com milhares de linhas/ano →
paginação/filtragem no servidor onde a lista pode crescer (compras, unidades).

**Constraints**: (1) núcleo de fiado intocado — nenhuma coluna existente muda
de semântica, nenhum fluxo atual quebra; (2) migrações só aditivas; (3) todo
campo novo é opcional (design aberto); (4) página pública nunca expõe custo,
lucro ou dados de compra.

**Scale/Scope**: 1 usuário (dono), ~1.000 compras/mês na planilha real; ~6
telas novas/alteradas no web; ~10 rotas novas na API.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` é o template placeholder (sem princípios
ratificados). Gates aplicados são as convenções do repo: centavos em Int,
SOLID use-cases + repositories (com in-memory para teste), Zod nos controllers,
campos opcionais por padrão. **PASS** (pré e pós-design).

## Project Structure

### Documentation (this feature)

```text
specs/025-loja-eletronicos/
├── plan.md              # Este arquivo
├── research.md          # Fase 0 — decisões de modelagem e cálculo
├── data-model.md        # Fase 1 — schema Prisma aditivo
├── quickstart.md        # Fase 1 — como rodar/verificar
├── contracts/
│   └── api.md           # Fase 1 — rotas novas e alteradas
└── tasks.md             # Fase 2 — (/speckit-tasks)
```

### Source Code (repository root)

```text
api/
├── prisma/
│   ├── schema.prisma                  # + Product, Purchase, StockUnit, SaleItem,
│   │                                  #   UserOption; colunas opcionais em Customer/Sale
│   └── migrations/025_loja_eletronicos/
└── src/
    ├── use-cases/
    │   ├── create-purchase.ts / update-purchase.ts / cancel-purchase.ts
    │   ├── receive-purchase-product.ts / confirm-purchase-credit.ts
    │   ├── purchase-cost.ts           # cálculo puro do custo efetivo (+ .spec.ts)
    │   ├── create-product.ts / update-product.ts / delete-product.ts
    │   ├── update-stock-unit.ts
    │   ├── import-purchases.ts        # planilha → compras (+ .spec.ts)
    │   ├── create-sale.ts             # ALTERA: aceita items[] opcionais
    │   ├── delete-sale.ts             # ALTERA: devolve unidades ao estoque
    │   └── reports/pending-panel.ts / dashboard.ts (ALTERA: + investimento, lucro/margem mês)
    ├── repositories/ (+ prisma/ + in-memory/)
    │   ├── products-repository.ts
    │   ├── purchases-repository.ts
    │   ├── stock-units-repository.ts
    │   └── user-options-repository.ts
    └── http/controllers/
        ├── products/  (routes, create, fetch, update, delete)
        ├── purchases/ (routes, create, fetch, update, cancel, receive, credit, import)
        ├── stock/     (routes, fetch, update-unit)
        └── sales/ reports/ customers/ public/  # rotas existentes com campos aditivos

web/src/
├── api/ (products.ts, purchases.ts, stock.ts + types)
├── pages/app/
│   ├── loja/                          # nova aba "Loja" com segmentos
│   │   ├── compras.tsx                # lista + form + pendências + importação
│   │   ├── estoque.tsx                # unidades por status + busca IMEI/SN
│   │   └── produtos.tsx               # catálogo
│   ├── new-sale.tsx                   # ALTERA: seção "Itens do estoque" + lucro/margem ao vivo
│   ├── customer-details.tsx           # ALTERA: lucro/margem/mark-up + itens/garantia na venda
│   ├── customers.tsx                  # ALTERA: campos novos no form (colapsáveis) + filtros
│   └── dashboard.tsx                  # ALTERA: investimento do mês, lucro/margem, pendências
└── pages/public/public-sale.tsx       # ALTERA: itens + garantia (sem custo/lucro)
```

**Structure Decision**: mantém a arquitetura existente (SOLID na API, páginas +
`components/ui` no web). Novidades ficam em módulos novos; arquivos existentes
recebem só extensões aditivas. A navegação ganha a aba **Loja** (compras /
estoque / produtos como segmentos internos) para não estourar o bottom nav.

## Decisões de integração (o "plug")

1. **Venda**: `create-sale` aceita `items?: { unitId, priceInCents,
   discountInCents? }[]`. Com itens: `productValueInCents` (se não informado) =
   Σ(preço − desconto) e `productCostInCents` = Σ custo efetivo das unidades;
   unidades → `SOLD` e `SaleItem` guarda snapshot (nome, custo, garantia).
   Sem itens: comportamento idêntico ao atual. `delete-sale` devolve unidades.
2. **Lucro/margem**: `profitInCents` já existe (entrada + total − custo). O
   serializer da venda passa a expor também `marginPercent` e `markupPercent`
   derivados — nada muda no banco nem nas vendas antigas.
3. **Página pública**: serializer whitelist ganha `items[] { name,
   warrantyUntil }` — nunca custo/lucro.
4. **Dashboard**: campos aditivos (`investedInCents` por mês, lucro/margem
   mensal via vendas × custo, contadores de pendências).
5. **Customer**: colunas novas opcionais (kind, cpfCnpj, endereço, instagram,
   tags) — controllers e telas tratam ausência como hoje.

## Complexity Tracking

Sem violações: nenhuma abstração nova além dos padrões já usados no repo.
