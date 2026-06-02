# Deploy — Pindurados (free)

**DB → Supabase** · **Comprovantes → Supabase Storage** · **API (Fastify) → Render (free)** ·
**Web → Vercel**. Sem custo: o Storage substitui o disco, então a API roda no plano free.

## 0. GitHub (uma vez)
```bash
git remote add origin https://github.com/SEU_USUARIO/pindurados.git
git push -u origin 001-recebimento-parcial   # ou merge na main e push
```

## 1. Supabase — banco + storage
1. Crie o projeto (guarde a **Database password**; evite símbolos, ou faça URL-encode).
2. **Connect → ORMs → Prisma**: copie `DATABASE_URL` (6543, `?pgbouncer=true`) e
   `DIRECT_URL` (5432). Troque `[YOUR-PASSWORD]`.
3. **Storage → New bucket** → nome **`comprovantes`** → marque **Public bucket**.
4. **Settings → API**: copie a **Project URL** (`SUPABASE_URL`) e a chave
   **service_role** (`SUPABASE_SERVICE_ROLE_KEY`, secreta).

> Erro `Can't reach database server at postgres.<ref>` = senha com caractere especial
> não-codificado. Reset a senha (só letras/números) ou faça URL-encode (@→%40, #→%23…).

## 2. API no Render (free, via render.yaml)
1. Render → **New → Blueprint** → conecte o repo (lê o `render.yaml`).
2. Preencha as envs `sync:false`: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` (o `SUPABASE_BUCKET=comprovantes` já vem).
3. Deploy. As migrations rodam no **build** (`prisma migrate deploy`). Health: `GET /health`.
   - Free dorme após inatividade (1ª request ~30s). Sem disco (usa o Storage).
   - No plano free não há `preDeployCommand` (é pago) — por isso o migrate vai no build.
4. Anote a URL (ex.: `https://pindurados-api.onrender.com`).

## 3. Web na Vercel
1. Vercel → **Add New → Project** → repo; **Root Directory** = `web/`.
2. Env: `VITE_API_URL=https://pindurados-api.onrender.com`.
3. Deploy → abra a URL, crie a conta em **/sign-up**.

## Como funciona o storage
- Com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` setados, os comprovantes vão para o
  bucket do Supabase; `/comprovantes/<key>` redireciona para a URL pública.
- Sem essas envs (dev local), grava em disco (`api/uploads`) e serve localmente.

## Checklist
- [ ] Repo no GitHub
- [ ] Supabase: DB (URLs) + bucket público `comprovantes` + service_role
- [ ] Render Blueprint + 4 envs preenchidas
- [ ] Vercel com `VITE_API_URL`
- [ ] `/sign-up` ok; comprovante abre (redireciona pro Storage)
