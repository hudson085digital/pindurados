# Feature Specification: Mensagem de Cobrança

**Feature Branch**: `001-recebimento-parcial` (trabalho contínuo) · **Created**: 2026-06-01 · **Status**: Draft

## Resumo

O sistema gera uma **mensagem de cobrança** pronta para uma venda, com: nome do
devedor, valor da próxima parcela em aberto, vencimento, saldo, **chave Pix padrão**
([[002-chave-pix]]), aviso de multa quando em atraso, e uma observação em letras
miúdas de que é uma mensagem do sistema. A usuária envia **manualmente** (abrindo o
WhatsApp do devedor). Devedores podem ter um marcador **lembrete automático** para
priorização/futuro envio agendado.

## User Stories

### US1 - Gerar e enviar cobrança manual (P1)
**Acceptance**:
1. **Given** uma venda com parcela em aberto e uma chave Pix padrão, **When** a usuária
   pede a cobrança, **Then** o sistema devolve a mensagem com valor, vencimento, saldo,
   a chave Pix e o aviso de sistema.
2. **Given** o devedor tem telefone, **When** gera a cobrança, **Then** o sistema
   fornece um link de WhatsApp já com a mensagem.
3. **Given** a parcela está em atraso, **When** gera a cobrança, **Then** a mensagem
   inclui a multa/juros aplicados.

### US2 - Marcar devedor para lembrete automático (P2)
**Acceptance**:
1. **When** a usuária ativa "lembrete automático" no devedor, **Then** o marcador é
   salvo (usado para futura automação/priorização).

### Edge Cases
- Sem chave Pix padrão: a mensagem é gerada sem a linha do Pix (e sinaliza configurar).
- Venda quitada: não há parcela em aberto — a cobrança informa que está em dia.
- Devedor sem telefone: gera a mensagem (texto) sem link de WhatsApp.

## Requirements

- **FR-001**: Gerar a mensagem de cobrança de uma venda com: nome do devedor, valor da
  próxima parcela em aberto, vencimento, saldo devedor e aviso de sistema (letras
  miúdas).
- **FR-002**: Incluir a **chave Pix padrão** (tipo, chave, banco, titular) quando
  existir; caso contrário, omitir a linha do Pix.
- **FR-003**: Quando a parcela estiver em atraso, incluir a multa/juros na mensagem.
- **FR-004**: Quando o devedor tiver telefone, fornecer um **link de WhatsApp** com a
  mensagem pré-preenchida.
- **FR-005**: Permitir marcar/desmarcar o devedor com **lembrete automático**
  (booleano), persistido.
- **FR-006**: O envio é **manual** nesta versão; o envio automático agendado fica como
  evolução futura (documentado).

## Key Entities
- **Customer**: ganha `autoReminder` (booleano).
- (Lê) **PixKey** padrão e **Sale**/**Installment**.

## Success Criteria
- **SC-001**: A mensagem gerada contém valor, vencimento, saldo, Pix padrão e o aviso
  de sistema em 100% dos casos com chave configurada.
- **SC-002**: O link de WhatsApp abre a conversa do devedor com a mensagem pronta.

## Assumptions
- Sem integração de envio automático (WhatsApp Business API) nesta versão; o
  "automático" é representado pelo marcador + o envio manual via link wa.me.
- País padrão Brasil (+55) ao montar o link, se o telefone não trouxer DDI.
