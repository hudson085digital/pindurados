# Feature Specification: Editar Venda

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-01 · **Status**: Draft

## Resumo

Permitir editar uma venda já registrada — descrição, **custo do produto** e **data da
venda** — sem precisar excluir e recriar. Alterações estruturais (valor, juros, nº de
parcelas) ficam fora desta versão por causa de recebimentos já alocados; o vencimento
por parcela é editável via [[006-vencimento-parcela]].

## User Stories

### US1 - Editar dados de uma venda (P1)
**Acceptance**:
1. **Given** uma venda, **When** a usuária altera descrição/custo/data e salva,
   **Then** os novos valores são persistidos e refletem no detalhe (ex.: lucro
   recalculado a partir do novo custo).
2. **Given** uma venda de outro usuário, **Then** a edição é negada.

### Edge Cases
- Custo negativo: rejeitado.
- Campos omitidos: permanecem como estavam (atualização parcial).

## Requirements
- **FR-001**: Permitir editar `description`, `productCostInCents` e `saleDate` de uma
  venda existente.
- **FR-002**: O lucro previsto MUST refletir o novo custo após a edição.
- **FR-003**: Não alterar parcelas/recebimentos nesta operação.
- **FR-004**: Cada usuário só edita as próprias vendas.

## Key Entities
- **Sale**: campos editáveis description, productCostInCents, saleDate.

## Success Criteria
- **SC-001**: Após editar o custo, o `profitInCents` da venda muda de acordo.

## Assumptions
- Edição estrutural (valor/juros/parcelas) = excluir e recriar, por ora.
