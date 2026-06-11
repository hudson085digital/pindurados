# Contract — Endpoints (023)

## Público (sem autenticação)

### `GET /public/sales/:token`

Resolve o link e devolve a visão pública da venda.

- **200** → `PublicSaleView` (ver data-model.md). Inclui `pix`/`contact` só se disponíveis.
- **404** → `{ message: "Link indisponível." }` para token **inexistente / revogado / expirado**
  (resposta uniforme — não revela se a venda existe). FR-013, SC-004.
- Sem header de auth necessário. CORS já liberado (`origin: true`).

Comprovantes: o front usa as `path`/`key` retornadas com a rota pública existente
`GET /comprovantes/:key` (disco ou redireciono Supabase). FR-014.

## Autenticado (dono — grupo de vendas, `verifyJwt`)

Todas validam que a venda pertence ao `userId` logado (senão `ResourceNotFoundError`).

### `POST /sales/:id/share-link`

Cria o link ou **rotaciona** o token (regenerar). Body opcional `{ expiresAt?: string }`.

- **201/200** → `{ token, url?, status: 'active', expiresAt }`. O front monta a URL pública
  (`origin + /p/ + token`).

### `GET /sales/:id/share-link`

Estado atual do link.

- **200** → `{ exists: boolean, token?: string, status?: 'active'|'revoked'|'expired', expiresAt? }`.

### `DELETE /sales/:id/share-link`

Revoga (invalida imediatamente). FR-003, SC-003.

- **204** → sem corpo. Próximo acesso público ao token → 404.

## Perfil do credor (contato) — opcional, autenticado

Reusar/estender o fluxo de perfil para definir `User.contactPhone` (ex.: `PATCH /me` ou tela de
configurações). Se não houver endpoint de update de perfil hoje, criar `PATCH /me`
`{ contactPhone?: string }`. Sem isso, a seção de contato simplesmente não aparece (degrada).

## Erros (reuso do handler global)

- Zod → 400 `{ message, issues }` (já existe).
- Regra de negócio / não encontrado → mensagens atuais.
- Público inválido → 404 genérico (acima).
