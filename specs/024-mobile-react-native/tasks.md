---
description: "Task list — App mobile local-first (Fase 1)"
---

# Tasks: App mobile local-first (Fase 1)

**Input**: Design em `specs/024-mobile-react-native/` (plan.md, spec.md, research.md, data-model.md, contracts/)

**Tests**: incluídos onde o valor é alto e foi pedido — **paridade do `@pindurados/core`** (obrigatória) e **unit dos repositórios locais**. UI é verificada manualmente em aparelho (EAS).

**Organização**: por user story (P1→P3), cada uma uma fatia testável de forma independente. `[P]` = paralelizável (arquivos diferentes, sem dependência pendente).

## Path Conventions

Monorepo pnpm: `packages/core/` (compartilhado), `api/`, `web/` (existentes), `mobile/` (Expo). Caminhos absolutos a partir da raiz do repo.

---

## Phase 1: Setup (infraestrutura compartilhada)

**Purpose**: montar o workspace e o esqueleto do app.

- [x] T001 Criar `pnpm-workspace.yaml` na raiz declarando `packages/*`, `api`, `web`, `mobile`.
- [x] T002 Criar `packages/core/package.json` (`@pindurados/core`, type=module, exports `./calc`, `./format`, `./types`, `.`), `tsconfig.json` e `vitest.config.ts`.
- [x] T003 [P] Scaffold do app em `mobile/` com Expo (managed) + Expo Router (`mobile/package.json`, `mobile/app.json`, `mobile/tsconfig.json`, `mobile/babel.config.js`).
- [x] T004 [P] Configurar NativeWind v4 em `mobile/` (`mobile/tailwind.config.js`, `mobile/metro.config.js`, `mobile/global.css`, `nativewind-env.d.ts`).
- [x] T005 [P] Adicionar deps do app em `mobile/package.json`: `@tanstack/react-query`, `react-hook-form`, `zod`, `expo-sqlite`, `expo-file-system`, `expo-image-picker`, `expo-document-picker`, `expo-image-manipulator`, `expo-sharing`, `expo-clipboard`, `react-native-toast-message`, `@pindurados/core` (workspace:*).
- [x] T006 `pnpm install` na raiz e confirmar que o workspace resolve `@pindurados/core` em `api/`, `web/` e `mobile/`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: extrair o core (Fase 0) e montar a base do app. **Bloqueia todas as user stories.**

### Fase 0 — `@pindurados/core` (fonte única da matemática)

- [x] T007 [P] Mover a regra de cálculo para `packages/core/src/calc/calculate-sale.ts` a partir de `api/src/use-cases/calculate-sale.ts` (TS puro, sem deps).
- [x] T008 [P] Mover/implementar `packages/core/src/calc/allocate-receipts.ts` a partir de `api/src/utils/allocate-receipts.ts`.
- [x] T009 [P] Implementar `packages/core/src/calc/redistribute.ts` (extraído da lógica de `web/src/pages/app/new-sale.tsx`) e `add-months.ts` (de `api`/`web`).
- [x] T010 [P] Mover formatação para `packages/core/src/format/` (`currency.ts`, `date.ts`, `masks.ts`) a partir de `web/src/lib/{utils,masks}.ts`.
- [x] T011 [P] Mover os tipos do domínio para `packages/core/src/types/` a partir de `web/src/api/types.ts` (Sale, Installment, Receipt, ReceiptMethod, PixKey, SaleType, InstallmentStatus, CalculationResult, CalculateBody).
- [x] T012 Criar `packages/core/src/index.ts` e os barrels `calc/index.ts`, `format/index.ts`, `types/index.ts` (API do contrato `contracts/core-api.md`).
- [x] T013 Mover o **teste de paridade** de juros/parcelas para `packages/core/test/parity.spec.ts` + casos de `allocate`/`redistribute`; `pnpm -F @pindurados/core test` verde.
- [x] T014 Migrar `api/` para importar de `@pindurados/core` (calculate-sale, allocate-receipts) e remover as cópias; `pnpm -F pindurados-api test` **sem regressão** (gate).
- [x] T015 Migrar `web/` para reexportar de `@pindurados/core` em `web/src/lib/utils.ts`, `web/src/lib/masks.ts`, `web/src/api/types.ts` (mantém imports atuais); `pnpm -F pindurados-web build` **sem regressão** (gate).

### Base do app mobile

- [x] T016 [P] Implementar o tema em `mobile/src/theme/tokens.ts` + preset em `mobile/tailwind.config.js` portando os tokens HSL claro/escuro de `web/src/index.css`; `useColorScheme`.
- [x] T017 [P] Inicializar o banco em `mobile/src/data/db.ts` (abre `expo-sqlite`, roda migrations) e criar `mobile/src/data/migrations/0001_init.ts` com o schema de `data-model.md` (tabelas + `meta.schema_version`).
- [x] T018 [P] Helper de arquivos em `mobile/src/data/files.ts` (garante `documentDirectory/comprovantes/`, salvar/ler/remover, compressão via `expo-image-manipulator`).
- [x] T019 [P] Wrappers de derivação em `mobile/src/data/derive.ts` usando `@pindurados/core/calc` (status/saldo de parcela e venda) + `mobile/src/lib/format.ts` reexportando `@pindurados/core/format`.
- [x] T020 Provedores em `mobile/app/_layout.tsx`: QueryClientProvider, ThemeProvider, `Toast`, e o Tab navigator (Resumo/Devedores/Nova venda/Pix/Backup) com a navbar nativa.
- [x] T021 [P] Primitivos de UI nativos em `mobile/src/components/ui/`: `button.tsx`, `card.tsx`, `input.tsx`, `skeleton.tsx`, `empty-state.tsx`, `tag.tsx`, `logo.tsx` (espelham os do web, em `View/Text/Pressable`).

**Checkpoint**: core publicado no workspace e com paridade verde; api/web sem regressão; app abre com tabs, tema e banco inicializado.

---

## Phase 3: User Story 1 — Abrir e ver/cadastrar (Priority: P1) 🎯 MVP

**Goal**: abrir sem login/offline, ver o Resumo e a lista de devedores, cadastrar devedor e venda persistindo no aparelho.

**Independent Test**: em modo avião, cadastrar devedor + venda, fechar/reabrir e confirmar persistência; Resumo reflete os dados.

- [x] T022 [P] [US1] `settingsRepo` em `mobile/src/data/repositories/settings.ts` (get/update/touchLastBackup; cria singleton).
- [x] T023 [P] [US1] `customersRepo` em `mobile/src/data/repositories/customers.ts` (list com saldo derivado, get, create, update, remove, setAutoReminder).
- [x] T024 [US1] `dashboardRepo.summary()` em `mobile/src/data/repositories/dashboard.ts` (agregações locais + derivação via core).
- [ ] T025 [P] [US1] Teste unit do `customersRepo` e do cálculo de saldo em `mobile/src/data/repositories/__tests__/customers.spec.ts`.
- [x] T026 [US1] Tela Resumo em `mobile/app/index.tsx` (cards de indicadores tabulares + estados loading/empty via Skeleton/EmptyState).
- [x] T027 [US1] Tela Devedores (lista + busca) em `mobile/app/devedores/index.tsx` com EmptyState que ensina o primeiro cadastro.
- [x] T028 [US1] Form "Novo devedor" (sheet/modal) em `mobile/src/components/customers/new-customer-sheet.tsx` (RHF+Zod, máscara de telefone do core).
- [x] T029 [US1] Ligar React Query (queries `['dashboard']`, `['customers']`) aos repos e invalidação nas mutations.

**Checkpoint**: US1 entregue e testável de forma independente (MVP).

---

## Phase 4: User Story 2 — Acompanhar e cobrar um devedor (Priority: P1)

**Goal**: detalhe do devedor com vendas/parcelas/recebimentos/comprovantes; cobrança via Share nativo; marcar atraso e editar vencimento.

**Independent Test**: abrir devedor com vendas, conferir parcelas/recebimentos, abrir comprovante, "Cobrar" abre o share com a mensagem pronta.

- [x] T030 [US2] `salesRepo` (leitura) em `mobile/src/data/repositories/sales.ts`: `get`/listagem por devedor já derivada (parcelas com status/overdue, recebimentos, saldo) via core.
- [x] T031 [P] [US2] `installmentsRepo` em `mobile/src/data/repositories/installments.ts`: `markLate`, `unmarkLate`, `updateDueDate`.
- [x] T032 [US2] `salesRepo.chargeMessage(saleId)` (monta a mensagem como no web, usando chave Pix padrão + telefone) e helper de Share em `mobile/src/lib/share.ts` (`expo-sharing`/`Share` + fallback `expo-clipboard`).
- [x] T033 [US2] Tela detalhe do devedor em `mobile/app/devedores/[id].tsx`: cabeçalho + saldo, lista de vendas (SaleCard), parcelas (InstallmentRow com Tags paga/parcial/vencida/+juros), recebimentos e abrir comprovante.
- [x] T034 [P] [US2] Componentes `mobile/src/components/sales/sale-card.tsx` e `installment-row.tsx` (incluindo ações marcar/tirar atraso e editar vencimento).
- [x] T035 [US2] Botão "Cobrar" no detalhe acionando o Share; estado quando não há telefone (copiar).

**Checkpoint**: US2 entregue; depende da base (Phase 2) e reaproveita leitura de vendas.

---

## Phase 5: User Story 3 — Registrar recebimento com foto (Priority: P1)

**Goal**: registrar recebimento (valor, formas, valor por forma, data, comprovante por câmera/galeria/PDF), abater saldo e permitir estorno.

**Independent Test**: em venda com saldo, registrar recebimento com foto offline; saldo cai; comprovante abre; estornar reverte.

- [x] T036 [US3] `receiptsRepo` em `mobile/src/data/repositories/receipts.ts`: `create` (valida valor ≤ saldo; 2+ formas exige soma=total; grava evento + attachments via core/allocate), `void` (estorno), `update`, `addAttachment`, `getAttachmentUri`.
- [x] T037 [P] [US3] Captura de comprovante em `mobile/src/components/receipts/attachment-picker.tsx` (`expo-image-picker` câmera/galeria + `expo-document-picker` PDF; compressão; salva via `files.ts`; trata permissão negada).
- [x] T038 [US3] Form de recebimento em `mobile/src/components/receipts/receipt-sheet.tsx` (RHF+Zod, formas múltiplas, valor por forma com validação de soma, "anexar depois", data).
- [x] T039 [US3] Integrar no detalhe do devedor: ação "Registrar recebimento", lista de recebimentos com estorno e badge "sem comprovante".
- [ ] T040 [P] [US3] Teste unit do `receiptsRepo` (alocação, validação de soma por forma, estorno) em `mobile/src/data/repositories/__tests__/receipts.spec.ts`.

**Checkpoint**: US3 entregue; com US1+US2 o ciclo de cobrança/pagamento fecha offline.

---

## Phase 6: User Story 4 — Nova venda com cálculo ao vivo (Priority: P2)

**Goal**: criar venda com prévia ao vivo (total/lucro/parcelas) calculada localmente e editor de parcelas custom (redistribute); editar/reparcelar.

**Independent Test**: criar venda parcelada vendo a prévia mudar, personalizar uma parcela, salvar; aparece no detalhe com os mesmos números do web.

- [x] T041 [US4] `salesRepo.create`/`update`/`remove`/`reparcel` em `mobile/src/data/repositories/sales.ts` usando `@pindurados/core` (calculateSale, redistribute) em transação (cria/recria parcelas preservando recebidos).
- [x] T042 [US4] Tela Nova venda em `mobile/app/nova-venda.tsx`: seleção de devedor, campos produto/custo/entrada/juros|valor-final/parcelas/datas, prévia ao vivo (debounce, cálculo local).
- [ ] T043 [P] [US4] Editor de parcelas custom em `mobile/src/components/sales/custom-installments.tsx` (fixar/redistribuir via core, somatório vs alvo).
- [x] T044 [US4] Guard de "sem devedor" (EmptyState com ação para cadastrar) e edição/reparcelamento de venda no detalhe.
- [ ] T045 [P] [US4] Teste unit do fluxo de criação/reparcelamento do `salesRepo` em `mobile/src/data/repositories/__tests__/sales.spec.ts`.

**Checkpoint**: US4 entregue; venda nasce no app.

---

## Phase 7: User Story 5 — Backup e restauração (Priority: P2)

**Goal**: exportar/importar arquivo `.pindurados` (dados+comprovantes) via share nativo, sem Login com Google; validar e não destruir dados em erro; lembrete de backup.

**Independent Test**: exportar; em instalação nova, importar e recuperar 100% (dados+comprovantes); importar inválido não corrompe.

- [x] T046 [US5] `exportBackup()` em `mobile/src/backup/export.ts` (serializa tabelas → data.json, copia comprovantes, monta manifest.json, zipa em cacheDirectory) — conforme `contracts/backup-format.md`.
- [x] T047 [US5] `importBackup(uri)` em `mobile/src/backup/import.ts` (abre zip, valida manifest/schemaVersion, confirma, restaura em transação com rollback em falha).
- [ ] T048 [P] [US5] Escolher e integrar a lib de zip compatível com Expo (managed se possível; senão documentar prebuild) em `mobile/src/backup/zip.ts`.
- [x] T049 [US5] Tela Backup em `mobile/app/backup.tsx`: Exportar (Share), Importar (document-picker) com diálogo de confirmação, e exibição de `last_backup_at`.
- [ ] T050 [P] [US5] Lembrete discreto de backup (quando `last_backup_at` antigo) em `mobile/src/components/backup/backup-reminder.tsx`.
- [ ] T051 [P] [US5] Habilitar Auto Backup do Android em `mobile/app.json` (allowBackup) + nota de limitação no quickstart.
- [ ] T052 [P] [US5] Teste unit do round-trip export→import em `mobile/src/backup/__tests__/backup.spec.ts` (incluindo arquivo inválido = sem alteração).

**Checkpoint**: US5 entregue; dados protegidos contra troca de aparelho.

---

## Phase 8: User Story 6 — Chaves Pix (Priority: P3)

**Goal**: CRUD de chaves Pix locais + padrão.

**Independent Test**: cadastrar (primeira vira padrão), trocar padrão, remover.

- [x] T053 [P] [US6] `pixKeysRepo` em `mobile/src/data/repositories/pix-keys.ts` (list/create/setDefault/remove; primeira = padrão).
- [x] T054 [US6] Tela Pix em `mobile/app/pix.tsx` (lista + form, marcar padrão, remover) e card de contato (WhatsApp do dono em `settings`).

**Checkpoint**: US6 entregue.

---

## Phase 9: Polish & Cross-Cutting

- [x] T055 [P] Garantir estados loading/empty/erro consistentes em todas as telas (FR-024) e tabular-nums nos valores.
- [ ] T056 [P] Acessibilidade: alvos ≥44px, labels, foco; respeitar tema do sistema.
- [ ] T057 Configurar `mobile/eas.json` (perfil `preview`) e gerar build interno (APK/TestFlight) para verificação no aparelho.
- [ ] T058 [P] Verificação manual em aparelho dos fluxos US1–US6 offline (checklist do quickstart) e ajuste de performance (listas/derivação).
- [x] T059 [P] Reconfirmar paridade ponta-a-ponta: mesmos parâmetros no web e no app → 0 divergência (SC-003/005); rodar `pnpm -F @pindurados/core test`.
- [ ] T060 [P] Atualizar `quickstart.md`/README do `mobile/` com decisões finais (lib de zip, prebuild se houver).

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** → **Phase 2 (Foundational)** bloqueiam tudo. Dentro da Fase 0, T007–T012 [P]; T013 depois deles; T014/T015 (gates de regressão) após T012.
- **User stories**: US1 (Phase 3) é o MVP. US2 e US3 dependem de US1 (base de leitura de devedor/venda) + Phase 2. US4 cria vendas (independe de US2/US3 para existir, mas o detalhe as exibe). US5 e US6 são independentes entre si.
- Ordem recomendada de entrega: **US1 → US2 → US3 → US4 → US5 → US6**, cada uma demonstrável isolada.
- Tarefas `[P]` no mesmo grupo tocam arquivos diferentes e podem ir em paralelo.

## Parallel Opportunities

- Fase 0: T007, T008, T009, T010, T011 em paralelo (arquivos distintos do core).
- Base mobile: T016, T017, T018, T019, T021 em paralelo.
- Repos por entidade ([P]) e seus testes ([P]) em paralelo dentro de cada story.

## Implementation Strategy

1. **MVP** = Phase 1 + Phase 2 + **US1**: app local que abre offline, cadastra e mostra o negócio.
2. Incrementos: US2 (cobrança) → US3 (recebimento com foto) fecham o ciclo diário; US4 (nova venda) tira a dependência do web; US5 (backup) protege os dados; US6 (Pix) completa.
3. Gates de qualidade sempre verdes: paridade do core (T013/T059) e suítes de api/web (T014/T015).

## Resumo

- **Total**: 60 tarefas (T001–T060).
- **Por story**: Setup 6 · Foundational 15 · US1 8 · US2 6 · US3 5 · US4 5 · US5 7 · US6 2 · Polish 6.
- **MVP**: Phases 1–2 + US1.
- **Fora de escopo** (sem tarefas): auth/login, servidor/sync, Login Google/OAuth, push, biometria, banco/bucket de produção.
</content>
