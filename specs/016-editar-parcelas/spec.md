# Feature Specification: Editar Venda — Valor e Data de Cada Parcela

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-02 · **Status**: Draft

## Resumo

Estende o reparcelamento ([[009-reparcelamento]]): ao editar a venda, a usuária pode
editar **tudo** — nº de parcelas, **valor de cada parcela** e **data de cada parcela**.
O reparcelamento regenera as parcelas com esses valores/datas e mantém os recebimentos.

## User Stories

### US1 - Editar valor e data de cada parcela (P1)
**Acceptance**:
1. **Given** o editar venda com "Reparcelar" ativo, **When** a usuária define o nº de
   parcelas, **Then** o editor gera uma linha por parcela com valor e data.
2. **When** salva, **Then** as parcelas são regeneradas exatamente com os valores/datas
   informados; o novo total é a soma dos valores.
3. **Given** já houve recebimentos, **Then** o que foi pago é mantido (cascata) e o
   reparcelamento abaixo do recebido é bloqueado ([[009-reparcelamento]]).

## Requirements
- **FR-001**: O editar venda MUST aceitar valores customizados por parcela
  (`customInstallmentValuesInCents`) e datas por parcela (`dueDatesISO`).
- **FR-002**: As parcelas regeneradas MUST usar exatamente esses valores e datas.
- **FR-003**: Sem datas informadas, cai na cascata a partir da 1ª (009).

## Success Criteria
- **SC-001**: Reparcelar com [700, 300, 200] e datas dadas resulta em 3 parcelas com
  exatamente esses valores/datas e total 1200.

## Assumptions
- O editor de parcelas do editar venda espelha o da nova venda, agora com data por
  parcela. Marcações de atraso são reiniciadas no reparcelamento.
