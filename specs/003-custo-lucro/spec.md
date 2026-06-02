# Feature Specification: Custo do Produto e Lucro

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-01 · **Status**: Draft

## Resumo

Ao registrar uma venda, a usuária informa o **custo** do produto (quanto ela pagou).
O sistema calcula o **lucro previsto** da venda (total a receber − custo) e agrega
isso no resumo, para ela saber quanto ganha.

## User Stories

### US1 - Informar custo e ver lucro da venda (P1)
**Acceptance**:
1. **Given** uma venda de produto custo R$ 600 e total R$ 1.000, **When** registrada,
   **Then** a venda mostra lucro previsto de **R$ 400**.
2. **When** o custo não é informado, **Then** assume R$ 0 e o lucro = total.

### US2 - Ver lucro agregado no resumo (P2)
**Acceptance**:
1. **Given** várias vendas com custo, **When** abre o resumo, **Then** vê o **custo
   total** e o **lucro previsto total** (soma de total − custo de todas as vendas).

### Edge Cases
- Custo maior que o total: lucro fica negativo (prejuízo) — exibido como tal.
- Venda já existente sem custo: custo = 0 (default), lucro = total.

## Requirements

- **FR-001**: Permitir informar o custo do produto (em centavos) na criação da venda;
  default 0.
- **FR-002**: O custo é um **snapshot** na venda (não muda se o cadastro do produto
  mudar) — aqui já é por venda, então naturalmente snapshot.
- **FR-003**: Expor por venda o **lucro previsto** = total a receber (com juros) −
  custo.
- **FR-004**: Expor no resumo o **custo total** e o **lucro previsto total**.

## Key Entities
- **Sale**: ganha `productCostInCents`.

## Success Criteria
- **SC-001**: Para uma venda custo 600 / total 1000, o lucro exibido é exatamente 400.
- **SC-002**: O lucro total do resumo confere com a soma por venda (0 divergências).

## Assumptions
- "Lucro previsto" usa o **total a receber** (com juros), não o que já foi recebido.
  Um "lucro realizado" pode ser feature futura.
