# Feature Specification: Comprovante de Pagamento Obrigatório

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-01 · **Status**: Draft

## Resumo

Ao registrar um **recebimento** ([[001-recebimento-parcial]]), anexar o **comprovante
de pagamento** (foto/PDF) passa a ser **obrigatório**. O comprovante fica disponível
no extrato para conferência. Estornos não exigem comprovante.

## User Stories

### US1 - Registrar recebimento com comprovante obrigatório (P1)
**Acceptance**:
1. **Given** a tela de recebimento, **When** a usuária tenta salvar sem anexar o
   comprovante, **Then** o sistema bloqueia e pede o anexo.
2. **When** a usuária anexa o comprovante e salva, **Then** o recebimento é criado e o
   comprovante fica acessível no extrato.

### Edge Cases
- Estorno: não exige comprovante.
- Arquivo inválido/vazio: rejeitado.

## Requirements
- **FR-001**: O registro de um recebimento MUST exigir um arquivo de comprovante
  (imagem ou PDF).
- **FR-002**: O comprovante MUST ser armazenado e acessível (link) no extrato do
  crediário.
- **FR-003**: Estornos MUST continuar sem exigir comprovante.

## Success Criteria
- **SC-001**: 100% dos recebimentos criados têm comprovante anexado.

## Assumptions
- Vale para Pix e dinheiro (foto do dinheiro/recibo). Pode ser relaxado para dinheiro
  numa versão futura, se desejado.
- Reaproveita o armazenamento de uploads já existente (`/comprovantes/`).
