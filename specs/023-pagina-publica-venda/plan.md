# Implementation Plan: Página pública do devedor (link por venda)

**Branch**: `023-pagina-publica-venda` (trabalho na branch atual `001-recebimento-parcial`) | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/023-pagina-publica-venda/spec.md`

## Summary

Permitir que o dono gere um **link por venda** (token aleatório revogável, expiração opcional) e o
devedor abra uma **página pública read-only** com total, pago, saldo, parcelas (status), recebimentos
e comprovantes, além de **como pagar** (PIX + saldo) e **contato** do credor. Servidor continua a
fonte da verdade; a superfície pública é isolada e usa um **DTO whitelist** que nunca expõe
custo/lucro nem dados de outras vendas. Detalhes em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.5 (web e api)

**Primary Dependencies**: api → Fastify 4, Prisma, Zod, JWT (sem libs novas; `crypto` nativo);
web → React 18, Vite 5, React Query v5, axios, react-router-dom 6 (sem libs novas).

**Storage**: Postgres — tabela nova `SaleShareLink` + coluna opcional `User.contactPhone`.
Comprovantes reutilizam a rota pública existente `/comprovantes/:key` (disco ou Supabase).

**Testing**: Vitest (api). Casos novos: validade do token (ativo/revogado/expirado) e whitelist do
DTO público (sem custo/lucro).

**Target Platform**: navegador (devedor abre no celular, sem login); painel do dono (web app atual).

**Project Type**: web application (frontend `web/` + backend `api/`).

**Performance Goals**: página pública abre em < 3s no celular (SC-001); leve, sem dependências do
layout autenticado.

**Constraints**: privacidade (FR-009/NFR-002 — nunca vazar custo/lucro nem outras vendas); token
não-adivinhável (NFR-001); revogação imediata (SC-003); 404 genérico para inválidos (SC-004).

**Scale/Scope**: app pessoal; poucos links ativos; acesso público read-only de baixa concorrência.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constituição (`.specify/memory/constitution.md`) é template, sem princípios ratificados → **sem gates
formais**. Seguimos convenções do repo: valores em **centavos**; lógica derivada/testável
(`serializePublicSale` puro a partir do já existente); specs enxutas em PT-BR; isolamento por usuário.

**Resultado**: PASS. Pós-design: PASS — a superfície pública é aditiva e isolada; privacidade
garantida por whitelist explícita (não por omissão).

## Project Structure

### Documentation (this feature)

```text
specs/023-pagina-publica-venda/
├── plan.md
├── research.md          # R1–R9
├── data-model.md        # SaleShareLink, User.contactPhone, PublicSaleView
├── quickstart.md
├── contracts/
│   └── api.md           # rotas pública + gestão do link
├── checklists/
│   └── requirements.md
└── tasks.md             # (gerado pelo /speckit-tasks)
```

### Source Code (repository root)

```text
api/
├── prisma/
│   └── schema.prisma                       # + SaleShareLink, + User.contactPhone (migration)
└── src/
    ├── utils/
    │   └── serialize-public-sale.ts        # DTO whitelist (+ .spec.ts)
    ├── repositories/
    │   ├── share-links-repository.ts       # interface + in-memory
    │   └── prisma/prisma-share-links-repository.ts
    ├── use-cases/
    │   ├── create-share-link.ts            # cria/rotaciona token
    │   ├── get-share-link.ts               # estado atual
    │   ├── revoke-share-link.ts            # revoga
    │   └── get-public-sale.ts              # resolve token → PublicSaleView (+ .spec.ts)
    └── http/
        └── controllers/
            ├── public/
            │   ├── routes.ts               # SEM verifyJwt
            │   └── get-public-sale.ts
            └── sales/                      # + share-link (POST/GET/DELETE) no grupo autenticado

web/
└── src/
    ├── routes.tsx                          # + rota top-level /p/:token (fora de Protected)
    ├── pages/
    │   └── public/
    │       └── public-sale.tsx             # página standalone read-only
    ├── api/
    │   ├── share-links.ts                  # create/get/revoke (dono)
    │   └── public.ts                       # getPublicSale(token)
    └── pages/app/customer-details.tsx      # + UI gerar/copiar/revogar no card da venda
```

**Structure Decision**: web app existente. Backend ganha um grupo de rotas **público isolado** (sem
JWT) + rotas autenticadas de gestão no grupo de vendas. Frontend ganha uma **rota top-level fora do
guard de login**. Mudanças no schema são aditivas (tabela nova + coluna opcional).

## Ordem de implementação (por prioridade)

1. **US1 (P1)** — visão pública read-only: schema `SaleShareLink`, repo, `get-public-sale` +
   `serialize-public-sale` (whitelist), rota pública, página `/p/:token`. (Para testar ponta a ponta
   precisa de pelo menos a criação do link — incluir o mínimo de US2.)
2. **US2 (P1)** — gestão do link pelo dono: use-cases create/get/revoke, rotas autenticadas, UI no
   card da venda (gerar/copiar/revogar/estado).
3. **US3 (P2)** — pagar + contato: `User.contactPhone` (+ atualização de perfil), PIX padrão e
   WhatsApp no DTO/página, omitindo seções quando ausentes.

## Complexity Tracking

Sem violações de constituição. Decisão de privacidade por **whitelist explícita** (em vez de
"remover campos do serialize atual") é intencional para evitar vazamento futuro — registrada em
research.md (R4).
