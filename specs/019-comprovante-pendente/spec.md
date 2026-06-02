# Feature Specification: Comprovante Pendente (anexar depois, com alerta)

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-02 · **Status**: Draft

## Resumo

O comprovante deixa de ser bloqueante (revisa a [[005-comprovante-obrigatorio]]): pode
ser **anexado depois** (ex.: vendi dia 01 e o cliente deu a entrada dia 10). Porém todo
recebimento/entrada **sem comprovante** fica em **alerta** até ser anexado — nada deve
ficar sem comprovante silenciosamente.

## User Stories

### US1 - Registrar recebimento sem comprovante (anexar depois) (P1)
**Acceptance**:
1. **Given** o registro de recebimento, **When** marco "anexar comprovante depois",
   **Then** o recebimento é salvo sem comprovante.
2. **Then** esse recebimento aparece com alerta "sem comprovante" no extrato.
3. **Then** o painel mostra a contagem de recebimentos sem comprovante.
4. **When** anexo o comprovante depois (editar), **Then** o alerta some.

## Requirements
- **FR-001**: Criar recebimento sem comprovante é permitido (não bloqueia).
- **FR-002**: Recebimento positivo, não estornado e sem comprovante é marcado como
  **pendente** (alerta) por venda e agregado no dashboard.
- **FR-003**: A UI oferece a opção explícita "anexar depois" e sinaliza os pendentes.
- **FR-004**: Anexar o comprovante (na edição) remove o pendente.

## Success Criteria
- **SC-001**: Recebimento sem comprovante é salvo e contado como pendente (venda e
  dashboard).

## Assumptions
- "Entrada" é um recebimento como outro qualquer; vale a mesma regra de pendência.
