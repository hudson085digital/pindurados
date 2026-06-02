# Feature Specification: Reparcelamento (editar valor / nº de parcelas)

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-02 · **Status**: Draft

## Resumo

Expande [[007-editar-venda]]: a edição da venda passa a poder **editar tudo**,
inclusive **valor do produto, juros e nº de parcelas**. Quando esses campos mudam, o
sistema faz um **reparcelamento** — recalcula o total e **regenera as parcelas** —
**considerando o que já foi recebido** (o pago é mantido e abatido do novo total via
a alocação em cascata de [[001-recebimento-parcial]]).

## User Stories

### US1 - Reparcelar uma venda mantendo o que foi pago (P1)
**Acceptance**:
1. **Given** uma venda de R$ 1.000 em 2x com R$ 500 já pagos, **When** a usuária
   reparcela para R$ 1.200 em 3x, **Then** as parcelas são regeneradas (3x R$ 400), o
   total vira R$ 1.200 e o saldo é R$ 700 (os R$ 500 pagos são considerados).
2. **Given** o novo total seria menor que o já recebido, **Then** o sistema bloqueia e
   informa o conflito.

### US2 - Editar sem reparcelar (P1)
**Acceptance**:
1. **When** a usuária edita só descrição/custo/data (sem tocar em valor/parcelas),
   **Then** nenhuma parcela é regenerada (comportamento da 007).

### Edge Cases
- Reparcelar uma venda já quitada: permitido (pode reabrir saldo se o novo total for
  maior).
- O vencimento da 1ª parcela regenerada usa o informado, senão o da 1ª parcela atual.

## Requirements
- **FR-001**: Permitir editar tipo, valor do produto, entrada, juros, nº de parcelas
  (e valores personalizados) de uma venda existente.
- **FR-002**: Ao alterar esses campos, recalcular o total e **regenerar** todas as
  parcelas (reparcelamento).
- **FR-003**: Os recebimentos existentes são mantidos e considerados no novo saldo.
- **FR-004**: Bloquear reparcelamento cujo novo total seja menor que o total já
  recebido.
- **FR-005**: Sem campos financeiros, manter o comportamento de edição simples (007).

## Key Entities
- **Sale** / **Installment**: parcelas substituídas; recebimentos preservados.

## Success Criteria
- **SC-001**: Após reparcelar, total e parcelas refletem o novo plano e o saldo desconta
  o que já foi recebido.

## Assumptions
- O reparcelamento substitui o cronograma inteiro (não preserva ids/edições pontuais de
  vencimento das parcelas antigas). Marcações de atraso são reiniciadas.
