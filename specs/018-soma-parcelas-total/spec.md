# Feature Specification: Soma das Parcelas = Total (última automática)

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-02 · **Status**: Draft

## Resumo

No editar venda, você define o **total** e o valor de cada parcela; a **última parcela
é calculada automaticamente** (total − soma das demais). A soma das parcelas **nunca**
pode ser menor nem maior que o total da venda — garantido no front e no back. Sem
cálculo automático de juros: os valores são definidos por você.

## User Stories

### US1 - Reparcelar mantendo a soma = total (P1)
**Acceptance**:
1. **Given** uma venda de R$ 1.600 em 2x, **When** mudo para 3 parcelas e informo a 1ª
   e a 2ª, **Then** a 3ª é calculada automaticamente para somar R$ 1.600.
2. **When** a soma das parcelas difere do total, **Then** o sistema bloqueia (front e
   back).
3. **Given** alguma parcela ≤ 0, **Then** é rejeitada.

## Requirements
- **FR-001**: A última parcela é derivada (total − soma das demais) no front.
- **FR-002**: O back valida: soma das parcelas == total informado; cada parcela > 0.
- **FR-003**: Sem cálculo automático de juros — os valores são definidos pelo usuário
  (aberto).

## Success Criteria
- **SC-001**: 1.600 em 3x com 1ª=600 e 2ª=600 ⇒ 3ª=400 e soma=1.600.
- **SC-002**: Tentar somar diferente do total é rejeitado no back.

## Assumptions
- O total é editável; a última parcela acompanha. Juros deixou de ser calculado
  automaticamente (decisão do usuário).
