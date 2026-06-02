# Feature Specification: Formas de Pagamento Combinadas

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-02 · **Status**: Draft

## Resumo

A forma de pagamento de um recebimento ([[001-recebimento-parcial]]) passa de **uma**
para **uma ou mais** formas combinadas. As opções são: **Pix, Cartão, Crédito, Débito,
Dinheiro**. Ex.: um recebimento pode ser "Pix + Dinheiro".

## User Stories

### US1 - Registrar/editar recebimento com zero, uma ou mais formas (P1)
**Acceptance**:
1. **Given** a tela de recebimento, **When** a usuária seleciona uma ou mais formas,
   **Then** o recebimento guarda todas as formas escolhidas.
2. **When** nenhuma forma é selecionada, **Then** o recebimento é aceito **sem forma**
   (campo opcional — pode ter ou não).
3. **Given** o extrato, **Then** as formas aparecem combinadas (ex.: "Pix + Dinheiro")
   ou nada, quando não informadas.

### Edge Cases
- Estorno herda as formas do recebimento original.
- Formas duplicadas são ignoradas (conjunto).

## Requirements
- **FR-001**: O recebimento MUST aceitar uma **lista** de formas (0+): PIX, CARD,
  CREDIT, DEBIT, CASH.
- **FR-002**: As formas são **opcionais** (pode não ter nenhuma).
- **FR-003**: O extrato MUST exibir as formas combinadas.
- **FR-004**: Estorno MUST copiar as formas do recebimento estornado.

## Key Entities
- **Receipt**: `method` (único) → `methods` (lista de formas).

## Success Criteria
- **SC-001**: Um recebimento "Pix + Dinheiro" persiste e exibe as duas formas.

## Assumptions
- Nesta versão a lista de formas é apenas qualitativa (sem valor por forma). Quebrar o
  valor por forma (ex.: 600 Pix + 400 Dinheiro) fica como evolução futura.
- Dados antigos (`method` PIX/CASH) são migrados para `methods` = [valor antigo].
