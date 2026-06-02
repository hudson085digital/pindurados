# Deploy — Pindurados

Arquitetura recomendada:

- **Banco de dados** → Supabase (PostgreSQL)
- **Web (Vite/React)** → Vercel
- **API (Fastify/Node)** → Render ou Railway

> ⚠️ Sobre a API na Vercel: a API grava os comprovantes em disco (`uploads/`) e os
> serve em `/comprovantes`. Funções serverless (Vercel) **não têm disco persistente**,
> então os arquivos somem entre requisições. Por isso a API deve ir para um host com
> disco persistente (**Render**/**Railway**). Alternativa futura: guardar os
> comprovantes no **Supabase Storage** (aí a API pode ir para serverless também).

---

## 1. Banco no Supabase

1. Crie um projeto em https://supabase.com.
2. Em **Project Settings → Database → Connection string**, copie:
   - **Pooled** (porta 6543) → vira `DATABASE_URL` (adicione `?pgbouncer=true`).
   - **Direct** (porta 5432) → vira `DIRECT_URL` (usada só nas migrations).
3. Rode as migrations apontando para o Supabase (localmente, uma vez):
   ```bash
   cd api
   DATABASE_URL="<pooled>" DIRECT_URL="<direct>" pnpm exec prisma migrate deploy
   DATABASE_URL="<pooled>" DIRECT_URL="<direct>" pnpm db:seed   # opcional: 1º usuário
   ```

## 2. API no Render (ou Railway)

- Novo **Web Service** apontando para a pasta `api/`.
- Build: `pnpm install && pnpm prisma:generate && pnpm build`
- Start: `pnpm start`
- Disco persistente montado em `api/uploads` (para os comprovantes).
- Variáveis de ambiente:
  ```
  NODE_ENV=production
  PORT=3333            # ou a porta que o host expõe
  JWT_SECRET=<um-segredo-forte>
  DATABASE_URL=<pooled do Supabase>
  DIRECT_URL=<direct do Supabase>
  ```
- Anote a URL pública (ex.: `https://pindurados-api.onrender.com`).

## 3. Web na Vercel

- Importe o repositório; **Root Directory** = `web/`.
- A Vercel detecta Vite; `web/vercel.json` já configura build, output e o rewrite SPA.
- Variável de ambiente do projeto:
  ```
  VITE_API_URL=https://pindurados-api.onrender.com
  ```
- Deploy. Abra a URL, crie sua conta em **/sign-up** e use.

## 4. CORS

A API hoje aceita qualquer origem (`origin: true` com credenciais). Para restringir à
origem da Vercel, ajuste `app.register(fastifyCors, …)` em `api/src/app.ts` lendo de uma
env (ex.: `WEB_ORIGIN`).

## Checklist
- [ ] Supabase criado e migrations aplicadas (`migrate deploy`)
- [ ] API no Render com disco em `uploads/` e envs setadas
- [ ] Web na Vercel com `VITE_API_URL` apontando para a API
- [ ] Cadastro (`/sign-up`) funcionando e dados isolados por usuário
