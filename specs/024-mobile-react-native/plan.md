# Implementation Plan: App mobile local-first (Fase 1)

**Branch**: `feat/024-mobile-react-native` | **Date**: 2026-06-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/024-mobile-react-native/spec.md`

## Summary

App nativo iOS/Android **local-first standalone**: armazena tudo no aparelho (SQLite + arquivos), funciona 100% offline, sem servidor, sem login e **sem Login com Google**. Recupera o que o servidor fazia (criar venda, alocar recebimentos, derivar status de parcela, marcar atraso, estorno) **no dispositivo**, reusando a matemática de dinheiro do web por meio de um pacote compartilhado novo, **`@pindurados/core`**. Proteção contra perda de dados via **backup/restauração por arquivo** (export/import com compartilhamento nativo; sem OAuth). UI porta as 7 telas do web para componentes nativos com a identidade "fintech limpa" (claro/escuro).

Abordagem em duas fases entregáveis:
- **Fase 0 — Fundação**: converter o repo em **pnpm workspace** e extrair **`@pindurados/core`** (cálculo + formatação + tipos, JS/TS puro) com teste de paridade; migrar `api/` e `web/` para importarem do core **sem regressão**.
- **Fase 1 — App**: scaffold Expo + camada de dados local (SQLite) que aplica as operações de negócio via `@pindurados/core`; as 7 telas (priorizando devedor-detalhe e nova-venda); captura de comprovante; cobrança via Share; **backup export/import**. Distribuição interna via EAS.

## Technical Context

**Language/Version**: TypeScript 5.x (compartilhado). Mobile em React Native 0.7x via **Expo SDK (managed)**; Hermes engine.

**Primary Dependencies (mobile)**: Expo + **Expo Router** (navegação file-based), **@tanstack/react-query v5** (estado, com `persistQueryClient`), **react-hook-form + zod**, **NativeWind v4** (Tailwind/RN, reusa tokens HSL do web), **expo-sqlite** (dados), **expo-file-system** (arquivos de comprovante), **expo-image-picker** + **expo-document-picker** (captura foto/PDF e seleção de backup), **expo-sharing** (export de backup / share da cobrança), **react-native-toast-message** (toasts). `Intl` pt-BR via Hermes.

**Primary Dependencies (compartilhado)**: **`@pindurados/core`** — TS puro, **zero deps de plataforma** (sem DOM, sem RN, sem Node-only). Contém `calc/` (calculate-sale, redistribute, allocate-receipts), `format/` (currency, date, phone/cents masks) e `types/` (DTOs do domínio).

**Storage**: **No aparelho** — SQLite (`expo-sqlite`) para dados estruturados; sistema de arquivos do app (`expo-file-system`) para comprovantes. Backup = arquivo único (JSON dos dados + comprovantes) exportável/importável. **Sem servidor, banco de produção ou bucket nesta fase.**

**Testing**: **Vitest** no `@pindurados/core` (unit + **teste de paridade** que trava os mesmos resultados hoje validados em `api/`); testes de unidade da camada de dados/repos do mobile sobre `@pindurados/core`; verificação manual em aparelho via build EAS.

**Target Platform**: iOS 15+ e Android 8+ (offline-capable).

**Project Type**: Monorepo (pnpm workspaces) com pacote compartilhado + app web (existente) + app mobile (novo) + api (existente). Mobile é **standalone** (não fala com a api).

**Performance Goals**: UI fluida a 60 fps; abrir o app e listar devedores < 1 s sobre base local típica (centenas de vendas); cálculo de prévia de venda perceptivelmente instantâneo (recalcula em < 50 ms localmente).

**Constraints**: **100% offline** na Fase 1; **sem Login com Google / sem OAuth** em nenhuma feature; mudanças no `api/`/`web/` devem ser **aditivas e retrocompatíveis** (extração do core não pode regredir o web); paridade de centavos com o web (garantida por teste).

**Scale/Scope**: 1 usuário (dono) por aparelho; ~7 telas; base local de centenas a poucos milhares de registros; arquivo de backup de até dezenas de MB (comprovantes comprimidos).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

A constituição do projeto (`.specify/memory/constitution.md`) está com o **template não preenchido** (sem princípios/regras ratificados). Portanto **não há gates formais** a violar. Aplicam-se, como princípios de fato do projeto (memória/CLAUDE.md), e este plano os respeita:

- **Local-first**: reforçado — o app passa a ser totalmente local. ✅
- **Uma fonte da verdade para dinheiro**: atendido pela extração do `@pindurados/core` + teste de paridade. ✅
- **Design aberto/flexível**: fases independentes e entregáveis; offline-extra/push/biometria deixados para depois. ✅
- **Sem regressão no web**: a migração de imports para o core é aditiva e coberta por testes. ✅

**Resultado**: PASS (sem violações; sem necessidade de Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/024-mobile-react-native/
├── estudo.md            # Estudo técnico original (origem)
├── spec.md              # Especificação (local-first)
├── plan.md              # Este arquivo
├── research.md          # Fase 0: decisões técnicas
├── data-model.md        # Fase 1: modelo de dados local (SQLite) + formato de backup
├── quickstart.md        # Fase 1: como rodar o workspace + app
├── contracts/           # Fase 1: contratos internos (core API, repos locais, backup)
│   ├── core-api.md
│   ├── local-data.md
│   └── backup-format.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root) — monorepo pnpm

```text
pindurados/
├── pnpm-workspace.yaml          # novo — declara packages/*, api, web, mobile
├── packages/
│   └── core/                    # @pindurados/core — TS puro, sem deps de plataforma
│       ├── src/
│       │   ├── calc/            # calculate-sale, redistribute, allocate-receipts
│       │   ├── format/          # currency, date, masks
│       │   ├── types/           # DTOs do domínio (Sale, Installment, Receipt, …)
│       │   └── index.ts
│       ├── test/                # vitest: unidades + PARIDADE (espelha api)
│       └── package.json
├── api/                         # existente — passa a importar @pindurados/core
│   └── src/ … (use-cases reusam core; sem regressão)
├── web/                         # existente — passa a importar @pindurados/core
│   └── src/lib/… (utils/masks/types reexportam de core)
└── mobile/                      # novo — Expo (managed)
    ├── app/                     # Expo Router (file-based)
    │   ├── _layout.tsx          # provedores (RQ, tema) + tabs
    │   ├── index.tsx            # Resumo (dashboard local)
    │   ├── devedores/
    │   │   ├── index.tsx        # lista
    │   │   └── [id].tsx         # detalhe (vendas/parcelas/recebimentos)
    │   ├── nova-venda.tsx       # wizard com cálculo ao vivo
    │   ├── pix.tsx              # chaves Pix
    │   └── backup.tsx           # exportar/importar backup
    ├── src/
    │   ├── data/                # camada local: schema + migrations + repos (SQLite)
    │   │   ├── db.ts            # abre/migra o SQLite
    │   │   ├── repositories/    # customers, sales, receipts, pix-keys
    │   │   └── derive.ts        # status/saldo via @pindurados/core
    │   ├── backup/              # export/import (JSON + arquivos) + validação
    │   ├── components/ui/       # primitivos nativos (Button, Card, Input, …)
    │   ├── lib/                 # tema (tokens HSL→NativeWind), money/format (via core)
    │   └── theme/               # tailwind preset com os tokens do web
    ├── tailwind.config.js       # NativeWind preset
    ├── app.json / eas.json
    └── package.json
```

**Structure Decision**: **Monorepo pnpm workspaces**. Justificativa: três consumidores da mesma matemática de dinheiro (`api`, `web`, `mobile`) — sem servidor, o mobile **precisa** dessa lógica no aparelho, então o custo de manter cópias (decisão D7 da 022) deixa de se justificar. `@pindurados/core` vira a fonte única, com o teste de paridade num só lugar. A migração de `api/` e `web/` é aditiva (reexportam do core) e coberta pela suíte existente para garantir zero regressão.

## Complexity Tracking

> Sem violações de constituição. Nada a justificar.
</content>
