# Feature Specification: Cadastro de Chaves Pix

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-01 · **Status**: Draft

## Resumo

A dona do negócio cadastra suas chaves Pix (para receber e para usar nas cobranças).
Cada chave tem **tipo** (aleatória, CPF, CNPJ, e-mail, telefone), a **chave**, o
**banco** e o **titular**. Uma chave é marcada como **padrão** — é a que entra
automaticamente nas mensagens de cobrança ([[004-mensagem-cobranca]]).

## User Stories

### US1 - Cadastrar e listar chaves Pix (P1)
A usuária cadastra uma ou mais chaves Pix e vê a lista. A primeira chave cadastrada
vira padrão automaticamente.

**Acceptance**:
1. **Given** nenhuma chave, **When** cadastra uma chave CPF, **Then** ela aparece na
   lista e fica marcada como padrão.
2. **When** cadastra com tipo/chave/banco/titular, **Then** todos os campos são salvos.

### US2 - Definir a chave padrão (P2)
A usuária escolhe qual chave é a padrão; só pode haver uma padrão por vez.

**Acceptance**:
1. **Given** duas chaves (A padrão), **When** marca B como padrão, **Then** B fica
   padrão e A deixa de ser.

### US3 - Excluir uma chave (P3)
**Acceptance**:
1. **When** exclui uma chave, **Then** ela some da lista.
2. **Given** a chave padrão foi excluída e restam outras, **Then** o sistema promove
   outra chave a padrão (a mais antiga).

### Edge Cases
- Excluir a única chave: lista fica vazia, sem padrão.
- Cadastrar chave duplicada (mesmo valor): permitido, mas idealmente avisado (fora do
  escopo bloquear).

## Requirements

- **FR-001**: Cadastrar chave Pix com tipo (RANDOM/CPF/CNPJ/EMAIL/PHONE), valor da
  chave, nome do banco e nome do titular.
- **FR-002**: Listar as chaves do usuário.
- **FR-003**: Marcar uma chave como padrão, garantindo no máximo **uma** padrão por
  usuário.
- **FR-004**: A primeira chave cadastrada é padrão automaticamente.
- **FR-005**: Excluir uma chave; se era a padrão e há outras, promover a mais antiga.
- **FR-006**: Cada usuário só vê/gerencia as próprias chaves.

## Key Entities
- **PixKey**: tipo, chave, banco, titular, isDefault, dono (User).

## Success Criteria
- **SC-001**: Sempre existe no máximo uma chave padrão por usuário (invariante).
- **SC-002**: A usuária cadastra uma chave em menos de 30s.

## Assumptions
- Chaves pertencem ao **usuário** (dono do negócio), não ao devedor.
- Sem validação de formato da chave por tipo nesta versão (campo livre).
