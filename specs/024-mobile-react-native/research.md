# Research — App mobile local-first (Fase 1)

Decisões técnicas que resolvem os pontos em aberto do plano. Formato: **Decisão · Porquê · Alternativas**.

## D1 — Monorepo pnpm workspaces + `@pindurados/core`

**Decisão**: converter o repo em pnpm workspace com `packages/core` (`@pindurados/core`), TS puro, sem deps de plataforma. `api/`, `web/` e `mobile/` consomem o core. O core concentra `calc/` (juros/parcelas/redistribute/allocate), `format/` (currency/date/masks) e `types/`. O **teste de paridade** da regra de juros (hoje em `api/`) migra para o core.

**Porquê**: sem servidor, o mobile precisa calcular **no aparelho** exatamente como o web/api. Manter 3 cópias da matemática sensível a dinheiro é risco real (a 022 já apontou). Uma fonte da verdade + teste único elimina divergência de centavos (SC-003).

**Alternativas**: (a) copiar utils para o mobile (rápido, mas 3 cópias — rejeitado pelo risco); (b) publicar o core no npm (desnecessário para repo único — workspace local resolve).

**Migração sem regressão**: o core é criado a partir do código já existente em `api/src/use-cases/calculate-sale.ts`, `api/src/utils/allocate-receipts.ts` e `web/src/lib/{utils,masks}.ts` + `web/src/api/types.ts`. `api/` e `web/` passam a **reexportar** do core (ex.: `web/src/lib/utils.ts` reexporta `formatCurrency` do core), mantendo os imports atuais funcionando. As suítes existentes (`api` vitest, `web` build) validam zero regressão.

## D2 — Armazenamento local: `expo-sqlite` para dados + `expo-file-system` para comprovantes

**Decisão**: dados estruturados em **SQLite** (`expo-sqlite`, API assíncrona) com schema espelhando o domínio; comprovantes (foto/PDF) gravados como **arquivos** em `FileSystem.documentDirectory/comprovantes/`, referenciados por caminho relativo no banco.

**Porquê**: SQLite é o padrão local-first no RN (transacional, consultável, robusto offline). Guardar binários grandes (fotos) **fora** do SQLite mantém o banco leve e o backup eficiente. Recebimentos permanecem **eventos imutáveis** (ledger) e o status/saldo da parcela é **derivado** via `allocate-receipts` do core — igual ao servidor de hoje.

**Alternativas**: AsyncStorage (chave-valor; insuficiente para consultas/relacionamentos — rejeitado); op-sqlite (mais rápido, mas exige bare/config plugin — desnecessário nesta escala). `expo-sqlite` no managed basta.

## D3 — Camada de dados que reaplica as operações do servidor

**Decisão**: um conjunto de **repositórios** locais (`customers`, `sales`, `receipts`, `pix-keys`) encapsula as operações que hoje são use-cases do `api/`: criar venda (calcula via core e persiste parcelas), registrar recebimento (aloca via core, grava evento, atualiza derivados), estornar, marcar/desmarcar atraso, editar venda/reparcelar, editar vencimento. Status PAID/PARTIAL/OPEN/overdue e saldos são **derivados** a partir dos eventos com o core, nunca duplicados como verdade.

**Porquê**: preserva a semântica do sistema atual (ledger imutável + derivação) sem servidor. Mantém a paridade conceitual com `api/` e facilita uma futura sincronização (fase posterior).

**Alternativas**: gravar status como coluna mutável (mais simples, mas perde a fonte-única-de-verdade e diverge do modelo atual — rejeitado).

## D4 — Estado e cache: React Query sobre os repositórios locais

**Decisão**: usar `@tanstack/react-query` com `queryFn` apontando para os repositórios SQLite (não HTTP). Mutations chamam os repos e invalidam as queries. Sem `persistQueryClient` obrigatório (o SQLite já é a verdade persistente), mas pode-se manter cache em memória para fluidez.

**Porquê**: mantém o **mesmo modelo mental do web** (queries/mutations/invalidation), reaproveitando padrões e reduzindo o atrito do port. As telas portadas mudam só a origem dos dados (repo local em vez de axios).

**Alternativas**: estado manual com Context/Zustand (reescreveria os padrões do web — rejeitado por custo/inconsistência).

## D5 — UI: NativeWind v4 reusando os tokens do web

**Decisão**: NativeWind v4 com um **preset Tailwind** que replica os tokens HSL do `web/src/index.css` (background, foreground, primary emerald, secondary, muted, destructive, border, radius) em claro/escuro. Tema do sistema via `useColorScheme`. Primitivos nativos (`Button`, `Card`, `Input`, `Skeleton`, `EmptyState`, `Tag`) espelham os do web.

**Porquê**: mesma identidade "fintech limpa" e mesma sintaxe de estilo → port mais rápido e visual consistente (FR-023). Tabular-nums para valores via `fontVariant`.

**Alternativas**: StyleSheet puro / Tamagui / styled-components (mais distante do web — rejeitado).

**Observação**: como não há `:root`/CSS, os tokens viram valores no preset (e/ou um mapa de cores por tema em JS). A conversão HSL→string é trivial e fica em `mobile/src/theme`.

## D6 — Captura de comprovante e compartilhamento

**Decisão**: `expo-image-picker` (câmera/galeria) + `expo-document-picker` (PDF) para capturar; comprimir imagem antes de salvar (`expo-image-manipulator`) para conter o tamanho do backup. Abrir comprovante com `expo-sharing`/visualizador do SO. Mensagem de cobrança via **Share nativo** (`Share`/`expo-sharing`), com cópia (`expo-clipboard`) como alternativa.

**Porquê**: recursos nativos são a razão do app (US3, US2). Compressão evita backups gigantes (Edge Cases).

**Alternativas**: só galeria (perde a câmera — rejeitado).

## D7 — Backup/restauração por arquivo, **sem Login com Google**

**Decisão**: **Export** = serializar todas as tabelas em JSON + empacotar os arquivos de comprovante em **um único arquivo** (`.pindurados` = zip) gravado em `cacheDirectory` e oferecido via `expo-sharing` (o usuário salva no Drive/WhatsApp/Files). **Import** = `expo-document-picker` seleciona o arquivo, o app **valida** (versão/*manifest*/integridade), **confirma com o usuário** e então **substitui** dados + arquivos atomicamente. No **Android**, habilitar o **Auto Backup do SO** (transparente, sem login no app) como complemento. Versão do schema embutida no manifest para evoluções futuras.

**Porquê**: atende "backup estilo WhatsApp" **sem** OAuth do Google (restrição explícita do dono). Arquivo único é portável e cross-platform (iOS+Android). Substituição com confirmação evita perda acidental (FR-019/020, SC-006/007).

**Alternativas**: Google Drive API (exigiria Login Google — **proibido**); só Android Auto Backup (não cobre iOS, cap de 25 MB, não dá restauração manual cross-device — insuficiente sozinho, vira complemento).

**Compactação**: usar uma lib de zip compatível com RN/Hermes (ex.: `react-native-zip-archive` via Expo prebuild, ou empacotamento próprio em tar/zip via JS). Decisão de lib fica para a Fase 1 (tasks), preferindo a que rode no managed; se exigir prebuild, documentar.

## D8 — Sem autenticação / sem servidor

**Decisão**: o app abre direto na tela inicial; não há login, conta, nem chamada de rede. Removidos do escopo: cliente HTTP, interceptor Bearer/refresh, SecureStore de token, e o ajuste de refresh-token no backend (do plano online anterior).

**Porquê**: decisão do dono (app de um usuário, local). Simplifica muito a Fase 1.

**Alternativas**: PIN/biometria local (adiado — Out of Scope desta fase).

## D9 — Identidade pt-BR

**Decisão**: moeda e datas via `Intl` (Hermes moderno suporta `Intl.NumberFormat`/`DateTimeFormat` pt-BR) reusando as funções de `@pindurados/core/format`. Garantir o build do Hermes com ICU pt-BR (Expo já inclui).

**Porquê**: mesma formatação do web (FR-022) sem reimplementar.

## Pontos resolvidos (sem NEEDS CLARIFICATION pendente)

- Relação com o web: **independente** (sem sync) — confirmado pelo dono.
- Login: **nenhum**; **sem Google** em nada — confirmado.
- Backup: **arquivo export/import** (sem OAuth) — decidido (D7), sinalizado ao dono.
</content>
