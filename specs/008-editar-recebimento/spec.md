# Feature Specification: Editar Recebimento

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-02 · **Status**: Draft

## Resumo

Permitir **editar** um recebimento já lançado — **valor**, **comprovante** e **data**
(e observação) — em vez de só estornar. Relaxa a imutabilidade definida em
[[001-recebimento-parcial]] (FR-002) para recebimentos **positivos e não estornados**;
o estorno continua existindo para reverter por completo.

## User Stories

### US1 - Editar um recebimento (P1)
**Acceptance**:
1. **Given** um recebimento lançado, **When** a usuária edita o valor/data/observação
   e salva, **Then** os novos dados são persistidos e o saldo/alocação recalculam.
2. **When** a usuária troca o comprovante, **Then** o novo arquivo substitui o anterior;
   se não enviar arquivo, mantém o atual.
3. **Given** o novo valor faria o total recebido ultrapassar o saldo, **Then** o
   sistema bloqueia e informa o máximo permitido.

### Edge Cases
- Editar um **estorno** (valor negativo): bloqueado.
- Editar um recebimento que **já foi estornado**: bloqueado (reverta o estorno antes).
- Novo valor zero/negativo: rejeitado.
- Editar sem enviar novo comprovante: mantém o comprovante atual (continua obrigatório
  ter um).

## Requirements
- **FR-001**: Permitir editar `amountInCents`, `receivedAt`, `note` e o comprovante de
  um recebimento positivo e não estornado.
- **FR-002**: Ao editar o valor, validar que o total recebido (com a alteração) não
  ultrapasse o total devido (limite ao saldo).
- **FR-003**: Sem novo arquivo, manter o comprovante atual (recebimento sempre tem um).
- **FR-004**: Bloquear edição de estornos e de recebimentos já estornados.
- **FR-005**: Cada usuário só edita recebimentos das próprias vendas.

## Success Criteria
- **SC-001**: Após editar o valor de um recebimento, o saldo e os status das parcelas
  refletem o novo valor.

## Assumptions
- Edição em modo single-user (local-first); prioriza praticidade sobre trilha de
  auditoria imutável. O estorno permanece para reversões completas.
