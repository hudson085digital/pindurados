# Design

Visual system for Pindurados. Register: **product** (clean fintech). Restrained
color strategy — one emerald accent over tinted neutrals, light + dark themes.
Tokens are HSL channels consumed by Tailwind as `hsl(var(--token))`.

## Theme

Light is the default (daytime use at a counter). Dark is fully supported and
toggled by the user; it persists in `localStorage` (`pindurados.theme`) and falls
back to `prefers-color-scheme`. The `.dark` class on `<html>` switches token sets.

## Color

Single accent: a refined **emerald** (`--primary`), used only for primary actions,
current selection, positive/settled state, and focus. **Red** (`--destructive`)
means debt / overdue / destructive only. Everything else is a tinted neutral ramp
(a hair of emerald hue in the grays — never warm/cream). No second accent, no
gradients, no decorative color.

### Light
| Token | HSL |
|---|---|
| `--background` | `168 22% 98%` |
| `--foreground` | `200 24% 14%` |
| `--card` | `0 0% 100%` |
| `--card-foreground` | `200 24% 14%` |
| `--primary` | `162 72% 30%` |
| `--primary-foreground` | `0 0% 100%` |
| `--secondary` | `168 28% 95%` |
| `--secondary-foreground` | `200 20% 22%` |
| `--muted` | `168 24% 96%` |
| `--muted-foreground` | `205 14% 40%` |
| `--destructive` | `0 72% 48%` |
| `--destructive-foreground` | `0 0% 100%` |
| `--border` | `168 16% 90%` |
| `--input` | `168 16% 88%` |
| `--ring` | `162 72% 34%` |
| `--radius` | `0.75rem` |

### Dark
| Token | HSL |
|---|---|
| `--background` | `200 28% 8%` |
| `--foreground` | `168 18% 92%` |
| `--card` | `200 24% 11%` |
| `--card-foreground` | `168 18% 92%` |
| `--primary` | `160 58% 42%` |
| `--primary-foreground` | `0 0% 100%` |
| `--secondary` | `200 18% 18%` |
| `--secondary-foreground` | `168 16% 88%` |
| `--muted` | `200 18% 16%` |
| `--muted-foreground` | `195 13% 64%` |
| `--destructive` | `0 66% 52%` |
| `--destructive-foreground` | `0 0% 100%` |
| `--border` | `200 16% 20%` |
| `--input` | `200 16% 22%` |
| `--ring` | `160 58% 52%` |

## Typography

One family: **Inter** (with `system-ui` fallback). Product UIs don't need
display/body pairing. Fixed rem scale (not fluid), tight ratio (~1.2). Numbers use
`font-variant-numeric: tabular-nums` (the `.tnum` utility / Tailwind `tabular-nums`)
so currency and dates align in columns — the ledger reflex.

- Brand wordmark: Inter semibold, paired with an emerald `ReceiptText` logomark in
  a rounded tile. No emoji in the wordmark.
- Headings: `text-lg`/`text-xl` semibold. Section labels: `text-xs` uppercase
  tracked muted (used sparingly, as a product label — not a marketing eyebrow).
- Body: `text-sm`; `text-base` on inputs to avoid iOS zoom.

## Shape & Elevation

- Radius: `--radius` (0.75rem) for cards/dialogs/buttons; `-2px`/`-4px` steps.
- Shadows are subtle and token-driven (`shadow-sm` resting, `shadow-md` on
  dialogs/overlays). No heavy drop shadows, no glow.

## Components

shadcn-style primitives in `src/components/ui`. Every interactive element ships
all states: default, hover, **focus-visible (2px ring + offset)**, active
(subtle `scale-[0.98]`), disabled, loading. Same button/control/icon vocabulary
across every screen — `lucide-react` icons only, consistent sizing.

- Loading → skeleton blocks (`Skeleton`), not centered spinners/"Carregando…".
- Empty → a muted lucide icon in a soft circle + one teaching sentence + the next
  action. Never a bare emoji or blank space.
- Tags/chips: `bg-secondary` (neutral), `bg-primary/10 text-primary` (positive),
  `bg-destructive/10 text-destructive` (overdue) — color always paired with text.

## Layout

Mobile-first, `container` capped at 768px. Sticky translucent header (logomark +
theme toggle + sair). Fixed bottom nav with active pill + `env(safe-area-inset)`
padding; touch targets ≥44px. Responsive behavior is structural, not fluid type.

## Motion

150–250ms, `ease-out`. Motion conveys state (hover, press, dialog enter, toast),
never decoration — no page-load choreography. Every transition has a
`prefers-reduced-motion: reduce` path (crossfade/instant). Don't animate layout
properties.
