# 📒 Pindurados

Sistema pessoal de controle de promissórias / vendas a prazo (fiado), desenvolvido com IA.

## Stack
- **Back-end** (`api/`): Fastify + TypeScript + Prisma + PostgreSQL + Zod + JWT + Vitest.
  Arquitetura SOLID baseada no padrão Rocketseat (use-cases, repositories prisma/in-memory,
  factories, http/controllers/middlewares).
- **Front-end** (`web/`): React + Vite + TypeScript + TailwindCSS + Radix/shadcn-style +
  TanStack React Query + React Router + React Hook Form + Zod + Axios. Padrão pizzashop-web.
- **Gerenciador:** pnpm.

## Como rodar
Veja **[COMO-USAR.md](./COMO-USAR.md)**.

## Regras de negócio
Veja **[ESPECIFICACAO.md](./ESPECIFICACAO.md)**.

## Roadmap
- [ ] Migrar banco para Supabase (produção / acesso de qualquer lugar).
- [ ] Deploy do front e da API na nuvem.
