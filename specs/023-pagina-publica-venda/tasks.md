---

description: "Task list — Página pública do devedor (link por venda)"
---

# Tasks: Página pública do devedor (link por venda)

**Input**: Design documents from `specs/023-pagina-publica-venda/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: incluídos onde o plano pede — validade do token e whitelist do DTO público.

**Organization**: tarefas agrupadas por user story (US1–US3), em ordem de prioridade.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1, US2, US3
- Caminhos relativos à raiz do repo

---

## Phase 1: Setup

**Purpose**: schema e migration (base de tudo).

- [ ] T001 Adicionar `model SaleShareLink` (token único, saleId único FK→Sale cascade, revoked, expiresAt?, createdAt) e coluna opcional `User.contactPhone` em `api/prisma/schema.prisma`; gerar migration (`pnpm prisma migrate dev --name sale-share-link`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: camada de repositório do link, usada por US1 (resolver) e US2 (gerir).

**⚠️ CRITICAL**: nenhuma user story começa antes disto.

- [ ] T002 [P] Criar interface + in-memory do repositório em `api/src/repositories/share-links-repository.ts` e `api/src/repositories/in-memory/in-memory-share-links-repository.ts` (findByToken, findBySaleId, upsert/rotate, revoke)
- [ ] T003 Criar `api/src/repositories/prisma/prisma-share-links-repository.ts` implementando a interface
- [ ] T004 [P] Helper de token aleatório (`crypto.randomBytes(32).toString('base64url')`) em `api/src/utils/generate-token.ts`

**Checkpoint**: repositório do link pronto.

---

## Phase 3: User Story 1 — Devedor consulta a venda pelo link (Priority: P1) 🎯 MVP

**Goal**: rota pública por token + página standalone read-only com total, pago, saldo, parcelas,
recebimentos e comprovantes.

**Independent Test**: com um link válido, abrir `/p/<token>` sem login → ver os dados da venda;
token inválido/revogado/expirado → "Link indisponível".

### Tests for User Story 1

- [ ] T005 [P] [US1] Teste do `serializePublicSale` em `api/src/utils/serialize-public-sale.spec.ts`: garante whitelist (sem `productCostInCents`/`profitInCents`/`productValueInCents`) e números corretos
- [ ] T006 [P] [US1] Teste do `get-public-sale` em `api/src/use-cases/get-public-sale.spec.ts`: válido→DTO; revogado/expirado/inexistente→erro tratado como 404

### Implementation for User Story 1

- [ ] T007 [US1] Criar `api/src/utils/serialize-public-sale.ts` — DTO whitelist (total, downPayment, pago, saldo, settled, parcelas[number/amount/dueDate/status/overdue/balance], recebimentos[date/amount/methods/attachments/receiptPath], customerName, creditorName, saleDescription); reutiliza `allocateReceipts`/lógica do `serializeSale`
- [ ] T008 [US1] Criar use-case `api/src/use-cases/get-public-sale.ts` — resolve token via repo, valida (ativo ∧ não expirado), carrega a venda e devolve `PublicSaleView`; inválido → erro tratado como 404
- [ ] T009 [US1] Criar controller `api/src/http/controllers/public/get-public-sale.ts` + `api/src/http/controllers/public/routes.ts` (SEM `verifyJwt`), retornando 404 genérico para inválidos; registrar `publicRoutes` em `api/src/app.ts`
- [ ] T010 [P] [US1] Criar client `web/src/api/public.ts` com `getPublicSale(token)` (chamada pública, sem exigir auth)
- [ ] T011 [US1] Criar página standalone `web/src/pages/public/public-sale.tsx` (total/pago/saldo, lista de parcelas com status, recebimentos com link de comprovante, estado "Link indisponível")
- [ ] T012 [US1] Adicionar rota top-level `/p/:token` em `web/src/routes.tsx` FORA de `<Protected>`/`<AppLayout>`

**Checkpoint**: US1 funciona ponta a ponta (precisa de um link criado — ver US2 ou criar via seed/manual).

---

## Phase 4: User Story 2 — Dono gera, copia e revoga o link (Priority: P1)

**Goal**: o dono gera/copia/revoga o link e vê o estado, a partir da tela da venda.

**Independent Test**: logado numa venda → gerar link → copiar; revogar → link para de abrir; gerar de
novo → novo link vale.

### Implementation for User Story 2

- [ ] T013 [US2] Use-case `api/src/use-cases/create-share-link.ts` (cria ou rotaciona token, `expiresAt?` opcional; valida que a venda é do `userId`)
- [ ] T014 [P] [US2] Use-case `api/src/use-cases/get-share-link.ts` (estado: inexistente/ativo/revogado/expirado)
- [ ] T015 [P] [US2] Use-case `api/src/use-cases/revoke-share-link.ts` (seta revoked=true)
- [ ] T016 [US2] Controllers POST/GET/DELETE `/sales/:id/share-link` em `api/src/http/controllers/sales/` + registrar no grupo autenticado `api/src/http/controllers/sales/routes.ts`
- [ ] T017 [P] [US2] Client `web/src/api/share-links.ts` (create/get/revoke)
- [ ] T018 [US2] UI no card da venda em `web/src/pages/app/customer-details.tsx`: gerar/copiar/revogar + estado; montar URL pública `window.location.origin + '/p/' + token`

**Checkpoint**: US1 + US2 — link gerenciável e funcional.

---

## Phase 5: User Story 3 — Como pagar e contato do credor (Priority: P2)

**Goal**: a página pública mostra chave PIX + valor do saldo e botão de WhatsApp do credor; some se
não cadastrado.

**Independent Test**: com PIX padrão e `contactPhone` cadastrados → seções aparecem; sem eles → a
página abre normal sem essas seções.

### Implementation for User Story 3

- [ ] T019 [US3] Estender `serialize-public-sale.ts` + `get-public-sale.ts` com `pix?` (chave padrão via `pixKeysRepository.findDefaultByUserId`) e `contact?` (`buildWhatsappUrl` a partir de `User.contactPhone`), omitindo quando ausentes; atualizar `serialize-public-sale.spec.ts`
- [ ] T020 [US3] Endpoint autenticado para o dono definir o contato: `PATCH /me` `{ contactPhone? }` (use-case + controller em `api/src/http/controllers/users/`)
- [ ] T021 [US3] Na página `web/src/pages/public/public-sale.tsx`: seção "Como pagar" (chave PIX + valor do saldo, copiar chave) e botão "Falar com o credor" (WhatsApp), condicionais
- [ ] T022 [P] [US3] UI do dono para cadastrar o telefone de contato (tela de perfil/config no web, ex.: em `web/src/pages/app/pix-keys.tsx` ou nova seção)

**Checkpoint**: todas as user stories funcionais.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T023 [P] Feedback (toasts `sonner`) ao gerar/copiar/revogar link
- [ ] T024 [P] Conferir que a página pública não puxa dados do layout autenticado (abrir em janela anônima)
- [ ] T025 [P] Atualizar docs (`COMO-USAR.md`) com o fluxo do link público
- [ ] T026 Rodar o roteiro de `specs/023-pagina-publica-venda/quickstart.md` (SC-001 a SC-006)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup — bloqueia as stories.
- **US1 (Phase 3)**: depende da Foundational. Para teste ponta a ponta precisa de um link (US2 ou seed).
- **US2 (Phase 4)**: depende da Foundational. Junto com US1 fecha o fluxo P1.
- **US3 (Phase 5)**: depende da US1 (estende o DTO/página).
- **Polish (Phase 6)**: depois das stories desejadas.

### Within Each User Story

- Schema/repo (Setup/Foundational) → serializer/use-case → controller/rota → client → UI.
- Backend de geração (US2) é o que cria os tokens que a US1 resolve.

### Parallel Opportunities

- T002 e T004 [P]; T005 e T006 [P] (web/api diferentes).
- US1 client (T010) em paralelo ao backend (T007–T009).
- US2 use-cases get/revoke (T014/T015) [P]; client (T017) [P].
- Polish: T023/T024/T025 [P].

---

## Parallel Example: User Story 1

```bash
# Testes da US1 juntos:
Task: "serialize-public-sale.spec.ts (whitelist)"
Task: "get-public-sale.spec.ts (validade do token)"
```

---

## Implementation Strategy

### MVP First (US1 + mínimo de US2)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. US1 (público) + T013/T016 (gerar link) →
4. **VALIDAR**: gerar link e abrir `/p/<token>` → 5. demo.

### Incremental Delivery

1. Setup + Foundational → base.
2. US1 + US2 → fluxo P1 completo (gerar/abrir/revogar) → demo.
3. US3 → pagar (PIX) + contato → demo.

---

## Notes

- Privacidade por **whitelist explícita** (T007): nunca expor custo/lucro/outras vendas (SC-002).
- 404 genérico para token inválido/revogado/expirado (T009) — não revela existência (SC-004).
- Comprovantes reutilizam a rota pública existente `/comprovantes/:key` (sem tarefa de storage).
- Valores em **centavos**; reuso do cálculo de saldo/alocação (FR-010).
- Commit após cada tarefa ou grupo lógico.
