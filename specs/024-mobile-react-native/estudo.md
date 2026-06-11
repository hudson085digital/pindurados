# Estudo Técnico: Versão Mobile em React Native

**Tipo**: Estudo de viabilidade / pesquisa técnica (pré-spec) | **Data**: 2026-06-03
**Status**: Para decisão. Ainda **não** é spec/plan/tasks.
**Escopo**: avaliar e desenhar um app nativo (iOS/Android) em React Native que reusa a API
Fastify/Prisma atual, e situar essa decisão frente à feature **022-pwa-offline** (em standby).

---

## 0. TL;DR (resumo executivo)

- **Tecnicamente é viável e relativamente barato**: a API já está pronta para servir um cliente
  mobile (REST + JWT). A maior parte da lógica de negócio (juros, parcelas, máscaras, formatação,
  tipos) é **JavaScript puro e portável**. O trabalho concentra-se em **reescrever a camada de UI**
  (~7 telas) para componentes nativos.
- **Stack recomendado**: **Expo (managed)** + **Expo Router** + **React Query** + **React Hook Form
  + Zod** + **NativeWind** (Tailwind no RN) + **axios**. Quase tudo que não é UI é reaproveitado
  do `web/` como está.
- **Dois bloqueios reais a resolver no backend** (pequenos e aditivos):
  1. **Refresh token está em cookie HttpOnly** → mobile precisa do refresh token no **corpo da
     resposta** (`/sessions` e `/token/refresh`).
  2. **CORS `origin: true`** está liberado — ok para mobile (mobile não usa CORS), mas precisa
     endurecer para produção sem quebrar o app.
- **Decisão estratégica que precede tudo**: vocês já vão entregar a **022-PWA** (instalável +
  offline). PWA e RN se sobrepõem em ~70% do valor para 1 usuário. **Recomendação**: **terminar a
  022 primeiro**, validar se o PWA já resolve a dor mobile, e só investir em RN se aparecer uma
  necessidade que o PWA não cobre (loja de apps, push nativo confiável no iOS, câmera/share
  nativos, "sensação de app"). Ver §8.
- **Risco principal de manutenção**: hoje a lógica de juros já é **copiada** (api → web, decisão D7
  da 022). Um terceiro cliente (mobile) torna isso 3 cópias. Antes do RN, vale extrair um
  **pacote compartilhado** (pnpm workspace). Ver §6.

---

## 1. Contexto: o que já temos hoje

### Backend (`api/`) — pronto para mobile
- **Fastify 4 + Prisma 5 + Postgres**, validação Zod, **@fastify/jwt**, **@fastify/multipart**.
- API **REST stateless** (Bearer token). Um cliente RN consome **exatamente os mesmos endpoints**
  do web — zero duplicação de regra de negócio no servidor.
- Entidades: `User`, `Customer`, `Sale`, `Installment`, `Receipt`, `ReceiptAttachment`, `PixKey`.
- Valores em **centavos (Int)**; juros como Float. Recebimentos são **eventos imutáveis** (ledger),
  status da parcela é **derivado** via `allocate-receipts.ts`.
- Uploads de comprovantes: disco local (dev) ou **Supabase Storage** (prod), servidos por
  `GET /comprovantes/<key>`.

### Frontend web (`web/`) — fonte do que será portado
- React 18 + Vite + **React Router 6** + **TanStack React Query v5** + **React Hook Form + Zod** +
  **axios** + **Tailwind + Radix UI** + Sonner (toasts).
- **7 telas**: sign-in, sign-up, dashboard, devedores (lista), devedor (detalhe), nova-venda,
  chaves-pix.
- Token em `localStorage['pindurados.token']`; interceptor axios injeta `Bearer` e trata 401.
- **Lógica pura reaproveitável** (sem DOM): `lib/utils.ts` (formatCurrency, formatDate,
  reaisToCents, addMonthsISO), `lib/masks.ts` (formatPhone, digitsToCents, centsToDisplay),
  `api/types.ts` (Sale, Customer, Installment, PixKey…), assinaturas dos `api/*.ts`.
- **022-pwa-offline** (standby) já planeja portar a calculadora de juros para o cliente
  (`lib/calc/calculate-sale.ts`) e um **outbox em IndexedDB** — conceitos diretamente reaplicáveis
  ao RN (trocando IndexedDB por SQLite/AsyncStorage).

### O que isso significa
> A API é "mobile-ready". O custo do RN é quase todo **UI + navegação + empacotamento nativo**,
> não regra de negócio. Esse é o melhor cenário possível para um port.

---

## 2. O que muda do web para o React Native

| Camada | Web (hoje) | React Native | Reaproveita? |
|---|---|---|---|
| Linguagem | TypeScript | TypeScript | ✅ 100% |
| HTTP | axios | axios | ✅ igual |
| Server state | React Query v5 | React Query v5 | ✅ igual (sem DOM) |
| Forms | React Hook Form + Zod | React Hook Form + Zod | ✅ igual |
| Tipos / DTOs | `api/types.ts` | mesmos | ✅ copiar/compartilhar |
| Regras (juros, datas, máscaras) | `lib/utils`, `lib/masks` | mesmos | ✅ JS puro |
| Navegação | React Router 6 | **Expo Router / React Navigation** | ⚠️ reescrever |
| UI / componentes | Radix + `<div>`/`<input>` | `<View>`/`<Text>`/`<Pressable>` | ❌ reescrever |
| Estilo | Tailwind (classes) | **NativeWind** (mesma sintaxe) | 🟡 design tokens reusam |
| Token storage | `localStorage` | **expo-secure-store** / AsyncStorage | ⚠️ trocar adaptador |
| Upload de arquivo | `<input type=file>` + FormData | **expo-image-picker** + FormData | ⚠️ reescrever captura |
| Toasts | Sonner | `react-native-toast-message` (ou Burnt) | ⚠️ trocar |
| Persistência offline | IndexedDB (Dexie) | **expo-sqlite** / op-sqlite | ⚠️ trocar driver |

**Conclusão**: o "miolo" (dados + regras + estado) viaja praticamente intacto. Reescreve-se a
**casca** (telas, navegação, captura de mídia, storage nativo).

---

## 3. Stack recomendado para o app RN

| Necessidade | Escolha | Por quê |
|---|---|---|
| Runtime/build | **Expo (managed) + EAS Build** | Sem Xcode/Android Studio configurados à mão; OTA updates; câmera/share/secure-store prontos. Para este app, bare RN não traz vantagem. |
| Navegação | **Expo Router** (file-based) | Mais próximo do mental model do React Router que já usam; deep links de graça (útil p/ links de cobrança). Alternativa: React Navigation puro. |
| Server state | **@tanstack/react-query** | Mesmo do web; `persistQueryClient` com AsyncStorage para cache offline. |
| Forms | **react-hook-form + zod** | Idênticos ao web. |
| Estilo | **NativeWind v4** | Mesma sintaxe Tailwind → portam os design tokens do `index.css` (cores teal/primary etc.). |
| HTTP | **axios** | Mesmo interceptor de Bearer/401, trocando localStorage→SecureStore. |
| Token seguro | **expo-secure-store** (access+refresh) | Keychain/Keystore nativo; melhor que AsyncStorage p/ credenciais. |
| Captura de comprovante | **expo-image-picker** (+ **expo-document-picker** p/ PDF) | Foto da câmera ou galeria; gera o arquivo p/ FormData. |
| Offline (fase 2) | **expo-sqlite** + persister do React Query | Equivalente nativo do outbox/IndexedDB da 022. |
| Push (opcional) | **expo-notifications** | Lembretes de vencimento — vantagem real sobre PWA no iOS. |
| Toasts | **react-native-toast-message** | Substitui Sonner. |
| Datas/moeda | `Intl` nativo do Hermes + utils portados | Hermes moderno suporta `Intl.NumberFormat` pt-BR. |

> **Nota sobre offline no RN**: nativo é melhor que PWA aqui — sem as limitações de Service Worker
> do Safari/iOS. A lógica de outbox/idempotência/remapeamento de IDs já desenhada na **022
> (research D3–D5)** se reaproveita **conceitualmente** quase 1:1.

---

## 4. Telas a portar (esforço por tela)

| Tela | Complexidade | Observações |
|---|---|---|
| Sign-in / Sign-up | Baixa | Form simples; ajustar fluxo de refresh token (§5). |
| Dashboard (`/reports/dashboard`) | Média | Cards + gráficos → usar `victory-native` ou `react-native-gifted-charts`. |
| Devedores (lista) | Baixa | Lista + busca + modal "novo devedor". |
| Devedor (detalhe) | **Alta** | Núcleo do app: vendas, parcelas com status PAID/PARTIAL/OPEN/overdue, recebimentos, comprovantes, marcar atraso, estorno. Maior parte do trabalho. |
| Nova venda | **Alta** | Wizard com cálculo ao vivo (`/sales/calculate`), editor de parcelas custom com `redistribute()`, entrada/juros/multa. |
| Recebimento (modal/sheet) | Média-Alta | Multipart com foto do comprovante, múltiplas formas de pagamento, valor por forma. |
| Chaves Pix | Baixa | CRUD simples + default. |
| Mensagem de cobrança | Baixa | `GET /sales/:id/charge-message` + **Share nativo** (vantagem mobile p/ WhatsApp). |

Estimativa grosseira (1 dev assistido por IA, em modo autônomo): **~2–3 semanas** para um MVP
navegável e funcional online (sem offline), assumindo backend ajustado. Offline real (fase 2)
adiciona **~1–2 semanas**.

---

## 5. Ajustes necessários no backend (pequenos e aditivos)

Estes são os **únicos pontos** que o app RN não consegue contornar sozinho:

### 5.1 Refresh token fora do cookie (bloqueador)
Hoje `/sessions` devolve `{ token }` (access, 10 min) e grava `refreshToken` num **cookie
HttpOnly** de 7 dias. Apps RN **não têm gestão de cookies confiável/transparente** como o browser.

**Opção recomendada**: detectar cliente mobile (header `X-Client: mobile` ou rota dedicada) e
**também devolver `refreshToken` no corpo** de `/sessions` e `/token/refresh`. O app guarda ambos
no **SecureStore** e envia o refresh explicitamente. Web continua usando cookie (sem regressão).

- Esforço: pequeno, aditivo, retrocompatível.
- Alternativa preguiçosa (não recomendada): aumentar a expiração do access token para mobile —
  pior em segurança.

### 5.2 CORS / segurança de produção
`origin: true` hoje. Mobile **não** dispara CORS (não é browser), então não quebra o app — mas
quando endurecerem o CORS para o web em produção, garantir que a allowlist não bloqueie nada que o
mobile dependa (ex.: `/comprovantes/*`). Sem ação imediata, só atenção.

### 5.3 Idempotência (só se/quando fizer offline)
A **022** já prevê `IdempotencyKey` + header `Idempotency-Key` em `POST /sales` e
`POST /sales/:id/receipts`. O outbox do RN usa **o mesmo contrato** — se a 022 entrar primeiro,
o mobile herda de graça. Se o RN vier antes, esse trabalho de backend migra para cá.

### 5.4 URLs de comprovante absolutas
Conferir se `GET /comprovantes/<key>` resolve para URL **absoluta** acessível pelo device (em dev,
`localhost` não funciona no celular físico — usar IP da LAN ou túnel). Em prod com Supabase, ok.

---

## 6. Reúso de código: copiar vs. pacote compartilhado

Hoje a regra de juros é **copiada** api→web (decisão consciente D7 da 022, mitigada por teste de
paridade). Um terceiro cliente RN cria **3 cópias** da mesma matemática sensível a dinheiro.

**Recomendação**: antes (ou junto) do RN, extrair um **pacote compartilhado** com pnpm workspaces:

```
pindurados/
├── pnpm-workspace.yaml          # novo
├── packages/
│   └── core/                    # @pindurados/core — JS puro, zero deps de plataforma
│       ├── calc/                # juros, parcelas, redistribute, allocate (espelha api)
│       ├── format/              # currency, date, masks
│       └── types/               # DTOs compartilhados (Sale, Installment, …)
├── api/                         # importa @pindurados/core
├── web/                         # importa @pindurados/core
└── mobile/                      # novo — Expo, importa @pindurados/core
```

- **Ganho**: uma fonte da verdade para a matemática de dinheiro; teste de paridade num lugar só.
- **Custo**: montar o workspace e migrar imports (baixo; já usam pnpm).
- **Trade-off honesto**: a 022 *deliberadamente* evitou o monorepo para não atrasar a feature. Com
  RN entrando, a balança vira a favor do pacote compartilhado. Decidir explicitamente.

---

## 7. Roadmap proposto (se for em frente)

**Fase 0 — Fundação (backend + reúso)**
1. Refresh token no corpo para mobile (§5.1).
2. (Opcional, recomendado) extrair `@pindurados/core` (§6).

**Fase 1 — MVP online (app navegável)**
3. Scaffold Expo + Expo Router + NativeWind + React Query + axios (interceptor Bearer/refresh com
   SecureStore).
4. Auth (sign-in/up), Devedores (lista + detalhe), Nova venda, Recebimento com foto, Chaves Pix,
   Dashboard, Mensagem de cobrança com Share nativo.
5. Distribuir build interno via **EAS** (TestFlight / APK) para o Hudson testar no aparelho.

**Fase 2 — Offline nativo**
6. Persister do React Query (AsyncStorage) + outbox em expo-sqlite, reaproveitando o desenho da 022
   (idempotência, remapeamento de IDs, total provisório).

**Fase 3 — Diferenciais nativos**
7. Push de lembrete de vencimento (expo-notifications), deep links de cobrança, biometria p/ abrir o
   app.

Cada fase é entregável de forma independente (alinhado ao "design aberto/flexível" do projeto).

---

## 8. Decisão estratégica: RN **vs / +** PWA (022)

Para **1 usuário** (o dono do negócio), boa parte do valor mobile já vem da **022-PWA**:

| Necessidade | PWA (022) resolve? | RN resolve melhor? |
|---|---|---|
| Instalar na home screen | ✅ | ✅ |
| Usar offline + sincronizar | ✅ (com limites iOS/Safari) | ✅ (sem limites) |
| Câmera p/ comprovante | 🟡 (input file/câmera web) | ✅ nativo |
| Compartilhar cobrança no WhatsApp | 🟡 (Web Share API) | ✅ Share nativo |
| Push de vencimento | ❌ frágil no iOS | ✅ confiável |
| Estar na App Store / Play Store | ❌ | ✅ |
| Custo de manutenção | ✅ 1 codebase | ❌ +1 codebase |
| Tempo até valor | ✅ já está quase pronto | ❌ semanas |

**Recomendação**: **concluir a 022 primeiro** e usar o PWA por algumas semanas. Se a dor restante
for concreta (push no iPhone, foto da câmera ruim no Safari, querer publicar na loja), aí o RN se
justifica e este estudo vira spec. Se o PWA já bastar, **economiza-se um codebase inteiro**.

> Este estudo deixa o caminho RN **pronto para acionar** — mas a sequência mais barata é
> PWA → avaliar → RN sob demanda.

---

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| 3 cópias da matemática de dinheiro divergirem | Pacote `@pindurados/core` + teste de paridade (§6). |
| Refresh token mobile mal feito (logout constante ou inseguro) | Padrão SecureStore + refresh no corpo, access curto (§5.1). |
| `localhost` não acessível do celular em dev | Usar IP da LAN / túnel (Expo) / `EXPO_PUBLIC_API_URL`. |
| Upload de comprovante grande no 4G | API já otimiza com `sharp`; comprimir no client antes (expo-image-manipulator). |
| Esforço subestimado nas 2 telas "Alta" | Priorizar Devedor-detalhe e Nova-venda primeiro; resto é rápido. |
| Sobreposição com PWA gerar retrabalho | Resolver §8 antes de codar. |

---

## 10. Próximos passos sugeridos

1. **Decidir §8** (PWA primeiro? RN agora? os dois?). É a única escolha que muda tudo o resto.
2. Se RN seguir: aprovar **§5.1 (refresh token mobile)** e **§6 (pacote compartilhado)** como
   pré-requisitos.
3. Promover este estudo a **spec** (`/speckit-specify`) com escopo = **Fase 1 (MVP online)**,
   mantendo offline e push como fases seguintes.

---

### Apêndice — arquivos-chave de referência (origem do port)

- Regras/format: `web/src/lib/utils.ts`, `web/src/lib/masks.ts`
- Tipos/DTOs: `web/src/api/types.ts`
- Cliente HTTP/auth: `web/src/lib/axios.ts`, `web/src/api/auth.ts`
- Tela complexa de referência: `web/src/pages/app/new-sale.tsx`
- Juros (servidor, fonte da verdade): `api/src/use-cases/calculate-sale.ts`
- Alocação de pagamento: `api/src/utils/allocate-receipts.ts`
- Serialização da venda: `api/src/utils/serialize-sale.ts`
- Auth/refresh: `api/src/http/controllers/users/authenticate.ts`
- Desenho offline reaproveitável: `specs/022-pwa-offline/research.md` (D3–D10)
</content>
</invoke>
