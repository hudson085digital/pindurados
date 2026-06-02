# Feature Specification: Valor por Forma de Pagamento

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-02 · **Status**: Draft

## Resumo

Evolui [[010-formas-pagamento]]: quando o recebimento tem **2 ou mais** formas, a
usuária informa **quanto entrou em cada forma** (ex.: R$ 1.000 = R$ 600 Pix + R$ 400
Dinheiro). Com 0 ou 1 forma, não há campos por forma (o valor é o total do recebimento).

## User Stories

### US1 - Registrar/editar valor por forma (P1)
**Acceptance**:
1. **Given** o recebimento, **When** a usuária seleciona **2+** formas, **Then** o
   sistema exibe um campo de valor para cada forma.
2. **When** a soma dos valores por forma difere do total do recebimento, **Then** o
   sistema bloqueia e mostra a diferença.
3. **Given** 0 ou 1 forma, **Then** não há campos por forma e o valor é o total.

### Edge Cases
- Valor por forma zero/negativo (com 2+ formas): rejeitado.
- Estorno herda as formas e os valores (negativados).
- Dashboard "por forma" usa o valor real por forma quando houver; senão, divide igual.

## Requirements
- **FR-001**: Com 2+ formas, o recebimento MUST guardar o valor de cada forma, alinhado
  às formas escolhidas.
- **FR-002**: A soma dos valores por forma MUST ser igual ao total do recebimento.
- **FR-003**: Com 0 ou 1 forma, não há valores por forma (derivado do total).
- **FR-004**: O dashboard "por forma" MUST usar o valor real por forma quando existir.

## Key Entities
- **Receipt**: ganha `methodAmountsInCents` (lista alinhada a `methods`).

## Success Criteria
- **SC-001**: "R$ 600 Pix + R$ 400 Dinheiro" persiste e a soma confere com o total.

## Assumptions
- `methodAmountsInCents` é alinhado por índice a `methods` (mesma ordem/tamanho quando
  há 2+ formas; vazio caso contrário). Modelagem pragmática, sem tabela à parte.
