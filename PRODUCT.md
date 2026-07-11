# Product

## Register

product

## Users

Pequenos comerciantes (o "credor") que vendem fiado / no crediário e precisam
controlar quanto cada cliente (o "devedor") deve, o que já foi pago e o que está
em atraso. Contexto de uso: no balcão, quase sempre no celular, entre um
atendimento e outro — precisa ser rápido, legível à luz do dia e sem fricção.
Também existe uma superfície pública (página `/p/:token`) que o devedor abre sem
login para acompanhar a própria dívida.

## Product Purpose

Sistema de **loja de eletrônicos** (025): compras em marketplace com
milhas/cashback (custo efetivo real), estoque de unidades serializadas
(SN/IMEI), venda com lucro/margem por venda e painel de pendências (produtos,
créditos e pagamentos de venda casada) — em cima do núcleo original de fiado:
registrar vendas (à vista, parcelada, com juros automático ou manual), lançar
recebimentos (com comprovante), acompanhar saldo e atrasos, cobrar pelo
WhatsApp e compartilhar uma página pública somente-leitura da venda. Sucesso =
o dono confia no número que o app mostra mais do que na planilha/caderno.

## Brand Personality

A marca é **MOB PHONE** ("mobphone", wordmark minúsculo): enérgica, direta e
confiável. A identidade vem do design system oficial em
`design/mobphone_design_system_v3.html` — gradiente assinatura orange → red,
Poppins nos títulos, Inter no corpo, JetBrains Mono em dados/overlines. Voz em
português do Brasil, coloquial mas precisa — verbos no imperativo ("Registrar
venda", "Cobrar"), frases curtas, sentence case, sem jargão bancário.
Três palavras: **quente, confiável, rápido.**

## Anti-references

- **SaaS genérico de IA**: gradientes roxos, glassmorphism, hero com número
  gigante. A "cara de template". (O gradiente da marca é orange→red e restrito a
  topos e ações primárias — nunca decoração difusa.)
- **Infantil / exagerado**: cores berrantes fora da paleta, excesso de emoji,
  visual de joguinho — destrói credibilidade num app que lida com dinheiro.
- **Creme + serifa + terracota**: o combo "editorial quente" que virou default.
- **Banco corporativo frio**: denso, azul-marinho impessoal, hostil.

## Design Principles

1. **A ferramenta some na tarefa.** Familiaridade é virtude; nada de affordances
   inventadas para ações padrão. O comerciante deve agir sem pensar na interface.
2. **O número manda.** Valores, saldos e datas são o conteúdo. Tipografia tabular,
   hierarquia clara, contraste alto — o dinheiro nunca fica em cinza apagado.
3. **Cor de marca ≠ cor de estado.** Orange (e o gradiente orange→red) é marca e
   ação primária. Estados usam os semânticos do DS: verde (success) = pago/em dia,
   rose (danger) = dívida/atraso/destrutivo. Como a marca é quente, danger é rose
   (não vermelho puro) para não se confundir com a marca.
4. **Contido por padrão.** O gradiente se gasta em poucos lugares (topo do app,
   ação primária, o card de destaque); o resto é neutro slate disciplinado.
5. **Desktop primeiro** (decisão de 10/07/2026): sidebar + conteúdo largo para
   operar a loja; o mobile continua funcional como fallback de balcão (bottom
   nav, alvos ≥44px).
6. **Enum do dono vira entidade.** Toda lista de domínio do usuário (CIA,
   formato, pagamento, entrega, origem, tipos, campos extras) é configurável
   (UserOption/meta JSONB) — enums só para máquina de estado e matemática.

## Accessibility & Inclusion

WCAG AA como piso: corpo ≥4.5:1, texto grande ≥3:1, placeholders legíveis. Foco
de teclado sempre visível (nunca remover sem substituir). `prefers-reduced-motion`
respeitado em toda animação. Tema claro (uso diurno) com modo escuro; ambos com
contraste verificado. Sem depender só de cor para transmitir estado (ícone/rótulo
acompanham verde/vermelho).
