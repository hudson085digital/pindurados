# Design

Visual system do **MOB PHONE** aplicado ao app. Register: **product**. Fonte de
verdade da identidade: `design/mobphone_design_system_v3.html` (+ logo em
`design/mobphone_logo_monogram.svg`). Tokens são canais HSL consumidos pelo
Tailwind como `hsl(var(--token))` em `web/src/index.css`.

## Marca

- Wordmark: **mob** (Poppins 700) + **phone** (Poppins 400, primary). Monograma
  "m" branco sobre tile com o gradiente da marca (componente `Logo`, variante
  `onBrand` para superfícies com gradiente).
- **Gradiente assinatura** `linear-gradient(135deg, #F97316, #EF4444)` — classe
  utilitária `.bg-brand-gradient`. Reservado a: topo do app, botão primário,
  card de destaque do dashboard, barras de progresso de marca. Nunca em texto,
  nunca em blocos grandes de leitura.

## Cores

Primária **orange** (ação/marca), acento red só dentro do gradiente, neutros
**slate**. Semânticos independentes da marca: **success green** = pago/em dia,
**danger rose** (#E11D48) = dívida/atraso/destrutivo — rose (e não vermelho puro)
para não colidir com a marca quente.

### Light
| Token | HSL | Ref |
|---|---|---|
| `--background` | `210 40% 98%` | slate-50 |
| `--foreground` | `217 33% 17%` | slate-800 |
| `--card` | `0 0% 100%` | white |
| `--primary` | `21 90% 48%` | orange-600 |
| `--secondary` / `--muted` | `210 40% 96%` | slate-100 |
| `--muted-foreground` | `215 16% 47%` | slate-500 |
| `--destructive` | `347 77% 50%` | rose #E11D48 |
| `--success` | `142 76% 36%` | green #16A34A |
| `--border` | `214 32% 91%` | slate-200 |
| `--input` | `213 27% 84%` | slate-300 |
| `--ring` | `25 95% 53%` | orange-500 |
| `--radius` | `1rem` | lg 16 · md 10 · sm 6 |

### Dark
Derivado da escala slate (o DS não define dark; adaptação documentada aqui):
bg slate-900, card slate-800, primary orange-400 (`27 96% 61%`), success/danger
clareados, borders slate-700. O gradiente da marca é o mesmo nos dois temas.

## Tipografia

- **Poppins** (display): h1–h3, wordmark, títulos de página/dialog e valores de
  destaque (stat cards). `font-display` no Tailwind.
- **Inter** (body): corpo, formulários, listas. `text-base` em inputs (iOS zoom).
- **JetBrains Mono** (dados): overlines/section labels (`font-mono text-xs
  uppercase tracking-[0.14em]`) e chaves/URLs. Adaptação: overlines em
  `muted-foreground` (o DS usa accent-600, mas vermelho em rótulos colidiria com
  a semântica de atraso num app de dinheiro).
- Valores monetários: Inter com `tabular-nums` para alinhamento em coluna.

## Forma & Elevação

Raio do DS: sm 6 / md 10 / lg 16 / full. Sombras slate (`sh-sm/md/lg`) já
mapeadas em `boxShadow` do Tailwind. Cards brancos sobre slate-50, `shadow-sm`.

## Componentes

shadcn-style em `web/src/components/ui`. Estados completos em tudo (default,
hover, focus-visible ring 2px, active scale, disabled, loading via prop
`loading` do Button com spinner).

- Button default = gradiente da marca + `hover:brightness-[1.07]`; secondary =
  tinta orange (primary/10 + borda primary/20); destructive = rose sólido.
- `Select` nativo estilizado, `Switch` (role=switch), `ConfirmDialog`
  (useConfirm — substitui window.confirm), `PasswordInput`, `PageHeader`.
- Loading → `Skeleton`; vazio → `EmptyState` (ícone + frase + ação).
- Tags/chips: neutro `bg-secondary`; positivo `bg-success/10 text-success`;
  atraso `bg-destructive/10 text-destructive`; marca `bg-primary/10 text-primary`
  — cor sempre acompanhada de texto.

## Layout

Mobile-first, `container` 768px. **Topo com o gradiente da marca** (logo onBrand
+ ações em branco/15). Bottom nav em superfície card, item ativo em pill
`bg-primary/10 text-primary`, alvos ≥44px, `env(safe-area-inset)`.

## Motion

150–250ms `ease-out`; motion só para estado (hover, press, dialog, toast, barras
de progresso). `prefers-reduced-motion` respeitado globalmente.
