# Feature Specification: Recebimento Manual e Pagamento Parcial

**Feature Branch**: `001-recebimento-parcial`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Recebimento manual e pagamento parcial de crediário. O sistema deve tratar recebimentos como eventos imutáveis em um extrato (cada recebimento tem data, valor e forma de pagamento — pix ou dinheiro), separados do cronograma de parcelas. O saldo devedor é sempre a soma das parcelas menos a soma dos recebimentos. O status de cada parcela (em aberto, parcial, quitada) é derivado, não armazenado. Quando um cliente paga um valor (ex: deve 1000 em 3x de 333,33 e paga 500), o sistema aloca o recebimento da parcela mais antiga para a mais nova (cascata): quita a parcela 1, abate parcialmente a parcela 2, deixa o restante em aberto. A sobra abate do saldo total (encurta o crediário), sem re-amortizar. Suportar pagamento parcial, pagamento a mais, múltiplos recebimentos, e estorno (recebimento negativo). Pagamento adiantado reduz a base de cálculo dos juros de atraso acumulativo. Deve manter histórico/auditoria de todos os recebimentos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar um recebimento e ver o saldo atualizado (Priority: P1)

A dona do negócio recebe um valor de um cliente (em dinheiro ou Pix) e o lança no
crediário dele. O sistema guarda esse recebimento como um evento, aloca o valor
automaticamente das parcelas mais antigas para as mais novas, e recalcula o saldo
devedor e o status de cada parcela na hora.

**Why this priority**: É o coração da feature. Sem registrar recebimentos e ver o
saldo cair corretamente, nada mais existe. Entrega valor sozinha: já permite
controlar quanto cada cliente ainda deve.

**Independent Test**: Criar um crediário de R$ 1.000,00 em 3 parcelas (333,33 +
333,33 + 333,34) e lançar um recebimento de R$ 500,00. Verificar que a parcela 1
fica **quitada**, a parcela 2 fica **parcial** (paga 166,67 / falta 166,66), a
parcela 3 fica **em aberto**, e o saldo devedor mostra **R$ 500,00**.

**Acceptance Scenarios**:

1. **Given** um crediário de R$ 1.000,00 em 3x (333,33 / 333,33 / 333,34) sem
   recebimentos, **When** a usuária lança um recebimento de R$ 500,00 em dinheiro,
   **Then** a parcela 1 fica quitada, a parcela 2 fica parcial (166,67 pagos /
   166,66 restantes), a parcela 3 fica em aberto e o saldo devedor é R$ 500,00.
2. **Given** o mesmo crediário com R$ 500,00 já recebidos, **When** a usuária lança
   um segundo recebimento de R$ 500,00 via Pix, **Then** todas as parcelas ficam
   quitadas, o saldo devedor é R$ 0,00 e o crediário fica com status quitado.
3. **Given** um crediário com saldo de R$ 200,00, **When** a usuária tenta lançar um
   recebimento de R$ 250,00, **Then** o sistema bloqueia a operação e informa que o
   valor máximo a receber é R$ 200,00 (não há pagamento a mais que o saldo).
4. **Given** qualquer crediário, **When** a usuária lança um recebimento, **Then**
   ela deve informar data do recebimento, valor e forma (Pix ou dinheiro), e pode
   opcionalmente registrar uma observação.

---

### User Story 2 - Estornar/corrigir um recebimento lançado errado (Priority: P2)

A usuária lançou um recebimento com valor ou data errados (ou o pagamento não se
confirmou). Como recebimentos são imutáveis, ela registra um **estorno** (um
recebimento negativo) que reverte o efeito, mantendo o rastro de que houve correção.

**Why this priority**: Erro de digitação em valor/forma é frequente e, sem uma forma
segura de corrigir, o saldo fica errado e a usuária perde confiança no sistema.
Depende da US1 existir, por isso P2.

**Independent Test**: Lançar um recebimento de R$ 500,00, depois lançar um estorno de
R$ 500,00 e verificar que o saldo devedor e os status das parcelas voltam exatamente
ao estado anterior, e que ambos os lançamentos continuam visíveis no extrato.

**Acceptance Scenarios**:

1. **Given** um crediário com um recebimento de R$ 500,00 já lançado, **When** a
   usuária estorna esse recebimento, **Then** o saldo devedor e os status das
   parcelas voltam ao estado anterior ao recebimento.
2. **Given** um recebimento estornado, **When** a usuária consulta o extrato,
   **Then** tanto o recebimento original quanto o estorno aparecem (nada é apagado).
3. **Given** um crediário, **When** a usuária tenta estornar um valor maior do que o
   total já recebido, **Then** o sistema impede a operação e explica o motivo.

---

### User Story 3 - Consultar o extrato/histórico de recebimentos (Priority: P3)

A usuária abre um crediário e vê a lista de todos os recebimentos (e estornos), com
data, valor, forma e quem lançou, além de quanto de cada recebimento foi para cada
parcela. Serve de prova em caso de dúvida do cliente ("quando você me pagou quanto?").

**Why this priority**: Agrega confiança e resolve disputas, mas o controle do saldo
(US1) e a correção (US2) já entregam o essencial. Por isso P3.

**Independent Test**: Após vários recebimentos e um estorno, abrir o extrato e
conferir que todos os lançamentos aparecem em ordem cronológica, com totais que
batem com o saldo devedor exibido.

**Acceptance Scenarios**:

1. **Given** um crediário com múltiplos recebimentos e um estorno, **When** a usuária
   abre o extrato, **Then** todos os lançamentos aparecem em ordem, com data, valor,
   forma e observação.
2. **Given** o extrato aberto, **When** a usuária soma os recebimentos exibidos,
   **Then** a soma confere com `total das parcelas − saldo devedor`.

---

### Edge Cases

- **Recebimento de valor zero**: deve ser rejeitado.
- **Recebimento em data futura**: permitido, porém sinalizado (ver Assumptions).
- **Pagamento a mais além do saldo total do crediário**: bloqueado — o sistema limita
  o recebimento ao saldo devedor e informa o valor máximo a receber.
- **Recebimento quando há multa/juros de atraso acumulado**: o valor abate primeiro
  multa+juros e só o restante reduz o principal da(s) parcela(s).
- **Estorno que excede o total recebido**: rejeitado.
- **Múltiplos recebimentos na mesma data**: todos aceitos e alocados na ordem em que
  foram lançados.
- **Crediário já quitado recebe novo recebimento**: bloqueado (saldo é zero, valor
  máximo a receber é zero).
- **Estorno de um recebimento que já havia quitado uma parcela**: a parcela volta a
  ficar parcial ou em aberto, por recálculo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir registrar um recebimento associado a um
  crediário, informando data do recebimento, valor e forma de pagamento (Pix ou
  dinheiro), com observação opcional.
- **FR-002**: Recebimentos MUST ser imutáveis após o lançamento — não podem ser
  editados nem excluídos; qualquer correção é feita via estorno (FR-009).
- **FR-003**: O sistema MUST calcular o saldo devedor de um crediário como a soma dos
  valores das parcelas menos a soma de todos os recebimentos (estornos contam como
  valor negativo).
- **FR-004**: O status de cada parcela (em aberto, parcial, quitada) MUST ser sempre
  derivado dos recebimentos no momento da consulta, nunca armazenado como verdade.
- **FR-005**: O sistema MUST alocar cada recebimento em cascata, da parcela de
  vencimento mais antigo para a mais nova, preenchendo totalmente uma parcela antes de
  passar para a próxima.
- **FR-005a**: Dentro de cada parcela em atraso, o recebimento MUST abater primeiro a
  multa e os juros acumulados e só então o principal; o restante segue em cascata para
  a próxima parcela.
- **FR-006**: Uma parcela parcialmente coberta MUST exibir o valor já pago e o valor
  restante.
- **FR-007**: Quando um recebimento excede o necessário para quitar a parcela atual, o
  excedente MUST avançar em cascata quitando/abatendo as parcelas seguintes (inclusive
  ainda não vencidas), **encurtando** o crediário, sem re-amortizar (sem recalcular os
  valores nominais das parcelas restantes). O total recebível é limitado ao saldo
  devedor (ver FR-015).
- **FR-008**: O sistema MUST suportar múltiplos recebimentos no mesmo crediário,
  inclusive na mesma data, alocados na ordem em que foram lançados.
- **FR-009**: O sistema MUST permitir estornar um recebimento por meio de um
  lançamento de valor negativo, que reverte o efeito do recebimento original por
  recálculo, sem apagar nenhum registro.
- **FR-010**: O sistema MUST garantir que um estorno não reduza o total recebido de um
  crediário a um valor negativo (não se pode estornar mais do que foi recebido).
- **FR-011**: Pagamentos adiantados (que cobrem parcelas ainda não vencidas) MUST
  reduzir a base sobre a qual os juros de atraso acumulativo são calculados nas
  parcelas seguintes.
- **FR-012**: O sistema MUST manter um histórico/extrato auditável de todos os
  recebimentos e estornos de um crediário, registrando ao menos: data do recebimento,
  data do lançamento, valor, forma, observação e autor do lançamento. O extrato MUST
  ser consultável por crediário.
- **FR-013**: O sistema MUST atualizar o status do crediário para quitado quando o
  saldo devedor chega a zero, e revertê-lo automaticamente caso um estorno volte a
  gerar saldo.
- **FR-014**: O sistema MUST rejeitar recebimentos de valor igual a zero e MUST
  validar que a forma de pagamento seja uma das opções aceitas.
- **FR-015**: O sistema MUST limitar o valor de um recebimento ao saldo devedor atual
  do crediário (multa+juros inclusos); ao tentar receber mais que o saldo, MUST
  bloquear e informar o valor máximo a receber. Não há crédito a favor do cliente
  nesta versão.

### Key Entities *(include if feature involves data)*

- **Crediário (Venda a prazo)**: representa uma dívida de um cliente, composta por um
  conjunto ordenado de parcelas. Possui saldo devedor (derivado) e status (em
  andamento / quitado). Já existe no domínio atual.
- **Parcela**: cada cota do crediário, com valor nominal, número de ordem e data de
  vencimento. Seu status (em aberto / parcial / quitada) e valor restante são
  **derivados**, não persistidos.
- **Recebimento**: evento imutável de entrada de dinheiro num crediário. Atributos:
  data do recebimento, valor (positivo para pagamento, negativo para estorno), forma
  (Pix ou dinheiro), observação opcional, data/autor do lançamento. É a única fonte da
  verdade sobre o que foi pago.
- **Alocação (derivada)**: a correspondência calculada entre o dinheiro recebido e as
  parcelas que ele cobre. Não é necessariamente persistida; pode ser recalculada a
  partir dos recebimentos e do cronograma.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dado um crediário de R$ 1.000,00 em 3 parcelas e um recebimento de
  R$ 500,00, o sistema apresenta o saldo devedor correto (R$ 500,00) e os status das
  3 parcelas (quitada / parcial / em aberto) em 100% dos casos de teste.
- **SC-002**: A usuária consegue registrar um recebimento completo (valor, forma,
  data) em menos de 30 segundos a partir da tela do crediário.
- **SC-003**: Após qualquer sequência de recebimentos e estornos, a soma dos
  recebimentos exibidos no extrato sempre confere com `total das parcelas − saldo
  devedor` (invariante verificável, 0 divergências).
- **SC-004**: Nenhum recebimento lançado é jamais perdido ou alterado: 100% dos
  recebimentos e estornos permanecem visíveis no extrato após correções.
- **SC-005**: Um pagamento adiantado reduz os juros de atraso futuros de forma
  verificável — em cenário de teste, o juros calculado após o adiantamento é menor do
  que seria sem ele.

## Assumptions

- O conceito de **Crediário** com **Parcelas** já existe no domínio do Pindurados;
  esta feature adiciona a camada de **Recebimentos** sobre ele, sem redesenhar o
  cronograma de parcelas.
- As formas de pagamento aceitas nesta versão são **Pix** e **dinheiro**; outras
  formas (cartão, etc.) estão fora de escopo.
- O sistema é **local-first** e operado por uma única usuária (a dona do negócio);
  "autor do lançamento" é registrado para auditoria futura, mas não há controle de
  múltiplos perfis nesta versão.
- A alocação padrão é **da parcela mais antiga para a mais nova**; não há, nesta
  versão, escolha manual de qual parcela receber (pode ser feature futura).
- A sobra de pagamento **encurta** o crediário (abate do saldo total) e **não**
  re-amortiza os valores das parcelas restantes.
- Recebimentos com data futura são permitidos (ex.: registrar um pagamento combinado),
  mas o cálculo de juros de atraso considera a data efetiva do recebimento.
- A regra de **juros de atraso acumulativo** já está especificada no domínio do
  projeto; esta feature apenas garante que o recebimento adiantado entra como redutor
  da base desse cálculo.

## Clarifications

### Session 2026-06-01

- **Q1 — Ordem de imputação multa/juros vs. principal**: Resolvido → o recebimento
  abate **primeiro** a multa + juros acumulados de uma parcela em atraso e só o
  restante reduz o principal (padrão de mercado; desincentiva o atraso). Incorporado
  em FR-005a e nos Edge Cases.
- **Q2 — Pagamento a mais que o saldo**: Resolvido → o sistema **limita** o
  recebimento ao saldo devedor e bloqueia o excedente, informando o valor máximo a
  receber. **Não** há crédito a favor do cliente nesta versão. Incorporado em FR-015,
  no cenário US1.3 e nos Edge Cases.
