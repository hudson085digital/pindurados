# Feature Specification: Vencimento por Parcela (base na 1ª + edição manual)

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-01 · **Status**: Draft

## Resumo

O vencimento de cada parcela é, por padrão, **derivado do vencimento da 1ª parcela**
(mesma data nos meses seguintes — já implementado). Esta feature permite (a) **definir
o vencimento da 1ª parcela** ao criar a venda e (b) **editar manualmente** o vencimento
de qualquer parcela depois.

## User Stories

### US1 - Definir o vencimento da 1ª parcela na venda (P1)
**Acceptance**:
1. **Given** a nova venda, **When** a usuária informa a data de vencimento da 1ª
   parcela, **Then** as demais caem no mesmo dia dos meses seguintes.
2. **When** não informa, **Then** usa o padrão (1 mês após a venda).

### US2 - Editar o vencimento de uma parcela (P1)
**Acceptance**:
1. **Given** uma parcela, **When** a usuária altera a data de vencimento, **Then** a
   nova data é salva e usada nos cálculos (vencida/atraso) e na cobrança.
2. **Given** parcela de outro usuário, **Then** a edição é negada.

### Edge Cases
- Editar para data passada: permitido (a parcela pode passar a contar como vencida).

## Requirements
- **FR-001**: A criação da venda MUST aceitar a data de vencimento da 1ª parcela; as
  demais derivam dela (cascata mensal). Sem informar, usa o padrão.
- **FR-002**: O sistema MUST permitir editar manualmente o vencimento de uma parcela.
- **FR-003**: O vencimento editado MUST refletir em "vencida"/atraso e na cobrança.
- **FR-004**: Cada usuário só edita parcelas das próprias vendas.

## Key Entities
- **Installment**: `dueDate` editável (já existe o campo).

## Success Criteria
- **SC-001**: Editar o vencimento de uma parcela altera a data exibida e o status
  "vencida" coerentemente.

## Assumptions
- Editar uma parcela **não** recalcula as demais (edição pontual). Recalcular toda a
  régua a partir de uma mudança é evolução futura.
