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

Substituir o "caderninho de fiado" por um app confiável: registrar vendas
(à vista, parcelada, com juros automático ou manual), lançar recebimentos
(com comprovante), acompanhar saldo e atrasos, cobrar pelo WhatsApp e
compartilhar uma página pública somente-leitura da venda. Sucesso = o comerciante
confia no número que o app mostra mais do que confiaria no próprio caderno.

## Brand Personality

Confiável, direto e calmo. É uma ferramenta de dinheiro: precisa transmitir
competência tranquila, não empolgação. Voz em português do Brasil, coloquial mas
precisa — verbos no imperativo ("Registrar venda", "Cobrar"), frases curtas,
sentence case, sem jargão bancário. Três palavras: **limpo, confiável, rápido.**

## Anti-references

- **SaaS genérico de IA**: gradientes roxos, glassmorphism, hero com número
  gigante. A "cara de template".
- **Infantil / exagerado**: cores berrantes, excesso de emoji, visual de joguinho
  — destrói credibilidade num app que lida com dinheiro.
- **Creme + serifa + terracota**: o combo "editorial quente" que virou default.
- **Banco corporativo frio**: denso, azul-marinho impessoal, hostil.

## Design Principles

1. **A ferramenta some na tarefa.** Familiaridade é virtude; nada de affordances
   inventadas para ações padrão. O comerciante deve agir sem pensar na interface.
2. **O número manda.** Valores, saldos e datas são o conteúdo. Tipografia tabular,
   hierarquia clara, contraste alto — o dinheiro nunca fica em cinza apagado.
3. **Verde é estar em dia; vermelho é atraso.** Cor carrega significado de estado,
   nunca decoração. Um único accent (emerald) para ação/positivo; vermelho só para
   dívida/atraso/destrutivo.
4. **Contido por padrão.** Um accent sobre muito neutro. Ousadia se gasta em um só
   lugar (a marca, o saldo em destaque), o resto é disciplinado.
5. **Mobile e balcão primeiro.** Alvos de toque ≥44px, legível à luz do dia,
   estados de carregamento/vazio que ensinam, nunca tela em branco.

## Accessibility & Inclusion

WCAG AA como piso: corpo ≥4.5:1, texto grande ≥3:1, placeholders legíveis. Foco
de teclado sempre visível (nunca remover sem substituir). `prefers-reduced-motion`
respeitado em toda animação. Tema claro (uso diurno) com modo escuro; ambos com
contraste verificado. Sem depender só de cor para transmitir estado (ícone/rótulo
acompanham verde/vermelho).
