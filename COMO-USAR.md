# Pindurados — Como usar

Sistema pessoal de controle de promissórias / vendas a prazo.
Arquitetura: **API** (Fastify + Prisma + PostgreSQL) e **Web** (React + Vite). Tudo com **pnpm**.

## Pré-requisitos
- Node.js (já instalado) e **pnpm**
- **Docker Desktop** aberto (para o banco PostgreSQL)

## Primeira vez (já está tudo feito, é só referência)
```bash
# Banco
cd api
docker compose up -d        # sobe o PostgreSQL
pnpm prisma migrate dev     # cria as tabelas
pnpm db:seed                # cria seu usuário de login
```

Usuário inicial:
- **e-mail:** hudson@pindurados.local
- **senha:** pindurados123  *(troque depois)*

## Para usar no dia a dia

Abra **dois terminais**:

**Terminal 1 — back-end (API):**
```bash
cd api
docker compose up -d   # garante o banco no ar
pnpm dev               # API em http://localhost:3333
```

**Terminal 2 — front-end (site):**
```bash
cd web
pnpm dev               # site em http://localhost:5173
```

Depois abra no navegador:
- **No computador:** http://localhost:5173
- **No celular (mesma rede Wi-Fi):** http://192.168.1.4:5173
  *(se o IP mudar, rode `ipconfig getifaddr en0`)*

Para desligar: `Ctrl + C` em cada terminal. O banco continua no Docker
(`docker compose down` em `api/` para parar o banco).

## O que dá pra fazer
1. **Resumo** — total a receber, recebido, parcelas vencidas.
2. **Devedores** — cadastrar quem deve; clicar pra ver vendas e parcelas.
3. **Nova venda** — automática (juros define parcelas) ou manual; com prévia do cálculo.
4. **Parcelas** — registrar pagamento (total ou parcial) com comprovante; marcar/tirar atraso com motivo.

## Onde ficam os dados
- **Banco:** dentro do Docker (volume `pindurados-pg-data`). No futuro, migra pro Supabase.
- **Comprovantes:** `api/uploads/`.
- **Backup rápido do banco:**
  `docker exec pindurados-pg pg_dump -U postgres pindurados > backup.sql`

## Estrutura do projeto
```
pindurados/
  api/   → back-end (Fastify, Prisma, SOLID: use-cases, repositories, factories, http/controllers)
  web/   → front-end (React, Vite, Tailwind, React Query, React Router)
  ESPECIFICACAO.md  → regras de negócio
```

## Regras de cálculo
Veja `ESPECIFICACAO.md` para o detalhamento completo dos juros.
Os testes da calculadora estão em `api/src/use-cases/calculate-sale.spec.ts` (`cd api && pnpm test`).
