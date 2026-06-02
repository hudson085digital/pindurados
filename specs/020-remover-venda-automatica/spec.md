# Feature Specification: Remover Venda Automática

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-02 · **Status**: Draft

## Resumo

Remover a regra de venda **AUTOMÁTICA** ("o juros define o total e o nº de parcelas —
cada 10% = 1 parcela"). Não existe mais esse modo. Restam **Manual** (juros % + nº de
parcelas) e **Por valor final** (BY_TOTAL).

## Requirements
- **FR-001**: O cálculo não tem mais o modo automático (10% = 1 parcela).
- **FR-002**: Criar venda usa por padrão **Manual**; opções: Manual e Por valor final.
- **FR-003**: O enum `AUTOMATIC` permanece no banco apenas para **compatibilidade** de
  vendas antigas (não é mais oferecido nem calculado).

## Success Criteria
- **SC-001**: Não é possível criar uma venda no modo automático; o cálculo dos 10% foi
  removido (testes atualizados).

## Assumptions
- Vendas antigas com `type = AUTOMATIC` continuam exibíveis (rótulo "Automática"), mas
  não há novo cálculo automático.
