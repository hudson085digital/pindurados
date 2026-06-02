# Deploy — Pindurados

Arquitetura: **DB → Supabase** · **API (Fastify) → Render** (disco persistente) ·
**Web (Vite/React) → Vercel**.

## 0. Subir o repositório no GitHub (uma vez)
Render e Vercel fazem deploy a partir do GitHub.
```bash
git remote add origin https://github.com/SEU_USUARIO/pindurados.git
git push -u origin 001-recebimento-parcial   # ou faça merge na main e push
```

## 1. Banco no Supabase
1. Crie um projeto em https://supabase.com (guarde a **Database password**).
2. Botão **Connect** (topo do painel) → aba **ORMs** → **Prisma**. Copie:
   - `DATABASE_URL` — Transaction pooler (**6543**, com `?pgbouncer=true`)
   - `DIRECT_URL` — Session/Direct (**5432**)
   (ou em **Settings → Database → Connection string**). Troque `[YOUR-PASSWORD]`.

> As migrations rodam sozinhas no deploy do Render (`preDeployCommand`). Para rodar do
> seu PC: `DATABASE_URL=... DIRECT_URL=... pnpm -C api exec prisma migrate deploy`.

## 2. API no Render (via render.yaml)
1. Render → **New → Blueprint** → conecte o repositório (ele lê o `render.yaml`).
2. Cria o serviço `pindurados-api` com **disco** em `/var/data/uploads`, build,
   migrations (preDeploy) e `JWT_SECRET` gerado.
3. Preencha as envs `sync: false`: **DATABASE_URL** e **DIRECT_URL** (passo 1).
4. Deploy. Anote a URL (ex.: `https://pindurados-api.onrender.com`). Health: `GET /health`.
   - Disco persistente exige plano pago (Starter). No Railway, use um **Volume**.

## 3. Web na Vercel
1. Vercel → **Add New → Project** → importe o repo; **Root Directory** = `web/`.
2. `web/vercel.json` já cuida do build Vite + rewrite SPA.
3. Env do projeto: `VITE_API_URL=https://pindurados-api.onrender.com`.
4. Deploy → abra a URL, crie a conta em **/sign-up** e use.

## 4. CORS (opcional)
Hoje a API aceita qualquer origem (`origin: true`). Para restringir à URL da Vercel,
ajuste `fastifyCors` em `api/src/app.ts` lendo de uma env (ex.: `WEB_ORIGIN`).

## Checklist
- [ ] Repo no GitHub
- [ ] Supabase criado; `DATABASE_URL`/`DIRECT_URL` em mãos
- [ ] Render via Blueprint + envs preenchidas + disco em `/var/data/uploads`
- [ ] Vercel com `VITE_API_URL` apontando para a API
- [ ] `/sign-up` funcionando; dados isolados por usuário
