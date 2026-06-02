# Feature Specification: Deploy (Supabase + Vercel)

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-02 · **Status**: Draft

## Resumo

Preparar o projeto para deploy: banco no **Supabase**, web na **Vercel**, API em host
com disco persistente (**Render/Railway**). Inclui config e guia ([[../../DEPLOY.md]]).

## Requirements
- **FR-001**: Prisma com `directUrl` (migrations diretas) + `url` (pooled) para o
  Supabase; localmente apontam para o mesmo banco.
- **FR-002**: `.env.example` (API e Web) documentando as variáveis de produção.
- **FR-003**: `web/vercel.json` com build Vite e rewrite SPA.
- **FR-004**: Guia de deploy passo a passo (DEPLOY.md).

## Notes / Pendências (precisam de credenciais do usuário)
- Criar projeto Supabase e aplicar `prisma migrate deploy` com as URLs.
- Subir a API no Render/Railway com **disco persistente** em `uploads/`.
- Importar o `web/` na Vercel e setar `VITE_API_URL`.

## Assumptions
- Uploads de comprovante hoje usam disco local → API precisa de disco persistente.
  Migrar para Supabase Storage (e então API serverless) fica como evolução futura.
