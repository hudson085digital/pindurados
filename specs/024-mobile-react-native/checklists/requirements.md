# Specification Quality Checklist: App mobile nativo (Fase 1 — MVP online)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-06-11
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Pivô de arquitetura (2026-06-11)**: a spec deixou de ser "MVP online reusando o servidor" e
  passou a **app local-first standalone**: tudo no aparelho, sem servidor/banco/bucket, sem login,
  **sem Login com Google**, com backup/restauração por **arquivo** (estilo WhatsApp, sem OAuth).
  Decisões registradas em Assumptions. Não há `[NEEDS CLARIFICATION]` pendente.
- **Tensão resolvida por decisão** (sinalizar ao usuário): "backup via Google" + "sem Login com
  Google" → backup = arquivo exportável/importável via compartilhamento nativo (usuário salva no
  Drive manualmente) + auto-backup do SO no Android. Sync automático na nuvem fica fora do escopo.
- `@pindurados/core` (regra de dinheiro compartilhada web↔mobile) segue válido e **mais
  necessário** — sem servidor, o cálculo roda no aparelho com a mesma fórmula do web. O ajuste de
  refresh token no backend foi **descartado** (mobile não usa servidor).
- Nomes de stack (Expo, SQLite, NativeWind) aparecem **apenas** em Assumptions/Out of Scope como
  contexto, não como requisito funcional — os FRs permanecem agnósticos.
- Pronta para `/speckit-plan`.
</content>
