# Research — Página pública do devedor (link por venda)

Stack: **api** Fastify + Prisma + Postgres + JWT; **web** React + Vite + React Query + axios.
Servidor é a fonte da verdade; esta feature adiciona uma **visão pública read-only** por token.

---

## R1 — Rota pública sem autenticação

- **Decisão**: novo grupo de rotas `publicRoutes` (arquivo `api/src/http/controllers/public/routes.ts`)
  **sem** o hook `onRequest: verifyJwt`. As rotas resolvem o acesso pelo **token**, não por `userId`.
- **Rationale**: as rotas atuais aplicam `app.addHook('onRequest', verifyJwt)` no grupo; basta um
  grupo separado sem esse hook. `/health` e `/comprovantes/:key` já são públicos — mesmo padrão.
- **Alternativas**: marcar rota a rota com `config` de auth opcional — mais frágil; grupo separado é
  mais claro e isola a superfície pública.

## R2 — Modelo do token (link compartilhável)

- **Decisão**: model Prisma `SaleShareLink` com `token` **único**, `saleId` (FK, único → 1 link por
  venda), `revoked` (bool), `expiresAt` (DateTime?), `createdAt`. Token =
  `crypto.randomBytes(32).toString('base64url')` (~43 chars, não-adivinhável).
- **Rationale**: 256 bits de entropia atende NFR-001. Um registro por venda simplifica "gerar /
  revogar / regenerar" (regenerar = rotaciona o `token` e zera `revoked`/`expiresAt`).
- **Alternativas**: token assinado (JWT sem expiração curta) — não permite revogação real sem
  blacklist; registro no banco permite revogar de imediato (FR-003/SC-003).

## R3 — Resolução e validade do token

- **Decisão**: `GET /public/sales/:token` → busca o link por token. Se **não existe**, `revoked`, ou
  `expiresAt` no passado → responde **404 genérico** ("indisponível"), sem revelar se a venda existe.
  Caso válido → monta o DTO público.
- **Rationale**: FR-013/SC-004 — não vazar existência. 404 uniforme para todos os casos inválidos.

## R4 — DTO público (whitelist, sem custo/lucro)

- **Decisão**: serializer dedicado `serializePublicSale` que **lista explicitamente** os campos
  seguros (NÃO faz spread do `sale`). Reaproveita `allocateReceipts`/`serializeSale` só para os
  números derivados.
- **Inclui**: `totalInCents`, `downPaymentInCents`, `totalPaidInCents`, `balanceInCents`, `settled`,
  `installments[{number, amountInCents, dueDate, status, overdue, balanceInCents}]`,
  `receipts[{receivedAt, amountInCents, methods, attachments:[{path}], receiptPath}]`,
  `customerName`, `creditorName`, `pix?` (chave padrão), `contact?` (whatsapp do credor),
  `saleDescription`.
- **Exclui** (FR-009): `productCostInCents`, `profitInCents`, `productValueInCents`, ids internos de
  usuário, e qualquer dado de outras vendas/clientes.
- **Rationale**: whitelist evita vazamento acidental quando o `serializeSale` mudar.

## R5 — Comprovantes pelo link

- **Decisão**: reutilizar a rota **já pública** `/comprovantes/:key` (serve do disco ou redireciona
  pro Supabase). O DTO público devolve os `path`/`key` dos comprovantes da venda; o front monta a URL.
- **Rationale**: FR-014 já está atendido pela infra atual (spec 021). As keys são nomes
  não-adivinháveis. Sem trabalho extra de storage.
- **Trade-off**: comprovantes são acessíveis por quem tiver a key; aceitável (keys aleatórias, uso
  pessoal). Documentado.

## R6 — Contato do credor

- **Decisão**: adicionar campo **opcional** `contactPhone` ao model `User` (telefone do dono para o
  devedor falar no WhatsApp). Reaproveitar `buildWhatsappUrl` (util existente) para montar o link.
  Se ausente, a seção de contato é omitida (FR-012, degrada com elegância).
- **Rationale**: o `build-charge-message` monta WhatsApp para o **telefone do cliente** (cobrança do
  dono → devedor). Aqui é o inverso (devedor → dono) e o `User` não tem telefone hoje. Campo opcional
  resolve sem quebrar nada.
- **Alternativas**: reusar uma chave PIX do tipo PHONE como contato — ambíguo; um campo dedicado é
  mais claro.

## R7 — Geração/gestão do link pelo dono (autenticado)

- **Decisão**: rotas autenticadas no grupo de vendas:
  `POST /sales/:id/share-link` (cria/rotaciona → retorna token+estado),
  `GET /sales/:id/share-link` (estado atual: ativo/revogado/expirado, ou inexistente),
  `DELETE /sales/:id/share-link` (revoga). Todas validam que a venda é do `userId` logado.
- **Rationale**: a gestão é ação do dono; reaproveita o `verifyJwt` e o isolamento por usuário.

## R8 — Frontend: rota pública isolada

- **Decisão**: adicionar uma 3ª rota **top-level** em `web/src/routes.tsx` (ex.: `/p/:token`)
  **fora** de `<Protected>`/`<AppLayout>`, renderizando uma página standalone `PublicSale`.
  O fetch é uma chamada pública (sem exigir token de auth; o interceptor não deve deslogar).
- **Rationale**: a página não pode depender do guard de login nem do layout do app. URL curta `/p/`
  é amigável para WhatsApp.
- **Detalhe**: o link completo = `window.location.origin + /p/ + token`. O backend não precisa saber a
  URL do front; o dono copia a URL montada no front.

## R9 — UI do dono (gerar/copiar/revogar)

- **Decisão**: no card da venda em `web/src/pages/app/customer-details.tsx`, botões "Gerar link" /
  "Copiar" / "Revogar" com indicação do estado. Novos clients em `web/src/api/` (ex.: `share-links.ts`).
- **Rationale**: é de onde o dono gerencia a venda hoje.

---

## Dependências novas

Nenhuma lib nova. `crypto` é nativo do Node; util de WhatsApp e storage de comprovantes já existem.

## Migrations

- `SaleShareLink` (tabela nova) + coluna opcional `User.contactPhone`. Uma migration Prisma.

## NEEDS CLARIFICATION

Nenhum — decisões de escopo/segurança já fechadas com o usuário na spec.
