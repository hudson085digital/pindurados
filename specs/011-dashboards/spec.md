# Feature Specification: Dashboards

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-02 · **Status**: Draft

## Resumo

Painel com várias visões do negócio: KPIs (a receber, recebido, lucro previsto,
vencidas), **recebido por mês**, **por forma de pagamento**, **top devedores** e
**próximos vencimentos**. Projetado para ser aberto/extensível (novos recortes podem
ser adicionados ao endpoint sem quebrar o resto).

## User Stories

### US1 - Ver o painel do negócio (P1)
**Acceptance**:
1. **Given** vendas e recebimentos, **When** abre o Resumo, **Then** vê KPIs e os
   recortes (mês, forma, top devedores, próximos vencimentos).
2. **Given** um recebimento com formas combinadas, **When** vê "por forma", **Then** o
   valor é dividido entre as formas (sem forma → "Sem forma").
3. **Given** parcelas em aberto, **Then** "próximos vencimentos" lista por data, com
   destaque para vencidas.

### Edge Cases
- Sem dados: cada seção mostra um estado vazio amigável.
- Estornos reduzem o recebido do mês/forma (líquido).

## Requirements
- **FR-001**: Endpoint de dashboard agregando totais, recebido por mês, por forma, top
  devedores e próximos vencimentos, do usuário logado.
- **FR-002**: "Por forma" divide o valor do recebimento entre suas formas; recebimento
  sem forma vai para "Sem forma".
- **FR-003**: "Top devedores" agrega o saldo por devedor (várias vendas) e ordena.
- **FR-004**: "Próximos vencimentos" lista parcelas não pagas por data de vencimento.

## Success Criteria
- **SC-001**: Os totais do painel conferem com a soma das vendas/recebimentos.
- **SC-002**: A soma de "recebido por mês" = total recebido (líquido).

## Assumptions
- Sem biblioteca de gráficos: visualização com barras simples (CSS).
- "Por forma" é qualitativo (split igual entre formas), já que não há valor por forma.
