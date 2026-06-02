# Feature Specification: Cadastro Público e Isolamento de Dados

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-02 · **Status**: Draft

## Resumo

Permitir que **outras pessoas criem conta** e usem o Pindurados para registrar suas
próprias vendas, com **isolamento total**: nenhum usuário vê os dados de outro.

## User Stories

### US1 - Criar conta e entrar (P1)
**Acceptance**:
1. **Given** a tela de cadastro, **When** informa nome/e-mail/senha válidos, **Then** a
   conta é criada e o usuário entra automaticamente.
2. **When** o e-mail já existe, **Then** o sistema avisa (409).

### US2 - Isolamento de dados (P1)
**Acceptance**:
1. **Given** dois usuários, **Then** cada um só vê/edita seus devedores, vendas,
   recebimentos, chaves Pix e relatórios.

## Requirements
- **FR-001**: Endpoint público de cadastro (nome, e-mail único, senha ≥ 6).
- **FR-002**: Senha armazenada como hash.
- **FR-003**: Todas as leituras/escritas são escopadas ao usuário autenticado
  (devedores por userId; vendas/parcelas/recebimentos via Sale→Customer→userId; chaves
  Pix por userId; relatórios por userId).
- **FR-004**: Tela de cadastro no front, com login automático após criar.

## Success Criteria
- **SC-001**: Um novo usuário não consegue ler nem alterar dados de outro (404/403).

## Notes
- Backend já possuía `POST /users` (register) + checagens de posse por `userId` em
  todos os use cases; esta feature adiciona a **tela de cadastro** e remove o e-mail
  padrão fixo do login.
