# Feature Specification: Comprovantes no Supabase Storage (deploy free)

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-02 · **Status**: Draft

## Resumo

Permitir hospedar a API em plano **free** (sem disco persistente) guardando os
comprovantes no **Supabase Storage** em vez do disco local. Modo duplo: sem config,
usa disco (dev/local); com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, usa o Storage.

## Requirements
- **FR-001**: Camada de storage única (`storeComprovante`) que grava no Supabase Storage
  quando configurado, senão no disco local.
- **FR-002**: As imagens continuam otimizadas (sharp) antes de subir; PDFs passam direto.
- **FR-003**: `GET /comprovantes/<key>` redireciona para a URL pública do Storage
  (quando ativo) ou serve do disco (local).
- **FR-004**: `render.yaml` no plano **free** (sem disco), com envs do Supabase.

## Success Criteria
- **SC-001**: Em dev (sem env Supabase), upload grava em disco e é servido em
  `/comprovantes/<key>` (200) — comportamento preservado.
- **SC-002**: Com env Supabase, o arquivo vai para o bucket e o link redireciona para a
  URL pública.

## Assumptions
- Bucket público `comprovantes`. Upload usa a chave service_role (server-side).
- Render free dorme após inatividade (cold start). Aceitável para uso pessoal.
