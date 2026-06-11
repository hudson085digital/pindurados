# Feature Specification: Página pública do devedor (link por venda)

**Feature Branch**: `023-pagina-publica-venda` · **Created**: 2026-06-03 · **Status**: Draft

## Resumo

O dono gera um **link compartilhável de uma venda específica** e envia ao devedor (ex.: WhatsApp).
O devedor abre o link **sem login** e vê uma página **somente leitura** com tudo sobre aquela venda:
valor total, quanto já pagou, **saldo devedor**, parcelas com status, recebimentos lançados e
**comprovantes anexados**. A página também mostra **como pagar** (chave PIX do dono + valor do saldo)
e um **contato/WhatsApp** do credor.

O acesso é por **token aleatório não-adivinhável**; o dono pode **revogar** e, opcionalmente, definir
**expiração**. Sem token válido, a página exibe um aviso amigável de "link indisponível". Dados
internos (custo/lucro) e dados de outras vendas/clientes **nunca** aparecem.

## User Scenarios & Testing

### User Story 1 — Devedor consulta a venda pelo link (Priority: P1)

O devedor recebe o link, abre no celular e vê o resumo da sua venda: total, pago, saldo, parcelas
(paga/em aberto/atrasada + vencimento) e os recebimentos com comprovantes.

**Why this priority**: É o coração da feature — dar transparência ao devedor sem login. Entrega valor
mesmo sem PIX/contato configurados.

**Independent Test**: Com um link válido de uma venda que tem parcelas e recebimentos, abrir o link
(sem estar logado) → a página mostra total, pago, saldo, a lista de parcelas com status e os
recebimentos/comprovantes daquela venda.

**Acceptance Scenarios**:

1. **Given** uma venda com token ativo, **When** o devedor abre o link sem login, **Then** vê total,
   total pago, saldo devedor e a lista de parcelas com status e vencimento.
2. **Given** recebimentos lançados na venda, **When** a página carrega, **Then** lista os
   recebimentos (data, valor, forma) e permite visualizar/baixar os comprovantes anexados.
3. **Given** a página pública, **When** ela é exibida, **Then** **não** mostra custo do produto,
   lucro, nem qualquer dado de outras vendas/clientes do dono.
4. **Given** o nome do devedor e a identificação do credor, **When** a página abre, **Then** mostra
   de quem é a dívida e quem é o credor (sem expor dados sensíveis extras).

---

### User Story 2 — Dono gera, copia e revoga o link (Priority: P1)

Na tela da venda, o dono gera o link público, copia para enviar ao devedor, vê se está ativo e pode
revogar (e gerar um novo).

**Why this priority**: Sem a geração/gestão do link pelo dono, a US1 não existe na prática. É a
contraparte autenticada da feature.

**Independent Test**: Logado, abrir uma venda → gerar link → copiar; revogar → o link antigo para de
funcionar (US1 mostra "indisponível"); gerar de novo → novo link funciona.

**Acceptance Scenarios**:

1. **Given** o dono logado numa venda, **When** clica em gerar link, **Then** o sistema cria um token
   aleatório e exibe o link completo para copiar.
2. **Given** um link já gerado, **When** o dono volta à venda, **Then** vê o estado do link
   (ativo/revogado/expirado) e pode copiá-lo novamente.
3. **Given** um link ativo, **When** o dono o revoga, **Then** o link deixa de abrir a página
   (passa a "indisponível") imediatamente.
4. **Given** um link revogado/expirado, **When** o dono gera um novo, **Then** um novo token passa a
   valer e o anterior continua inválido.
5. **Given** a geração do link, **When** o dono opta por definir expiração, **Then** após a data o
   link para de funcionar automaticamente (expiração é opcional).

---

### User Story 3 — Como pagar e falar com o credor (Priority: P2)

Na página pública, o devedor vê a chave PIX do dono e o valor do saldo para pagar, e um botão para
falar com o credor (WhatsApp).

**Why this priority**: Aumenta a chance de pagamento e reduz atrito, mas a consulta (US1) já entrega
valor sozinha. Depende de o dono ter PIX/telefone cadastrados.

**Independent Test**: Com chave PIX padrão e telefone do credor cadastrados, abrir o link → a página
mostra a chave PIX, o valor do saldo e um botão de contato; sem esses cadastros, a página omite as
seções com elegância.

**Acceptance Scenarios**:

1. **Given** o dono tem chave PIX padrão, **When** a página abre, **Then** mostra a chave e o **valor
   do saldo** para facilitar o pagamento.
2. **Given** contato do credor disponível, **When** o devedor toca em "falar com o credor", **Then**
   abre o WhatsApp/contato.
3. **Given** o dono **não** tem PIX ou contato cadastrado, **When** a página abre, **Then** ela omite
   essas seções sem quebrar (degrada com elegância).

---

### Edge Cases

- **Token inexistente/inválido/revogado/expirado**: página amigável de "link indisponível", sem
  vazar se a venda existe ou não.
- **Venda quitada**: a página mostra saldo zero e marca como quitada (sem seção de PIX para pagar, ou
  com aviso de quitado).
- **Venda sem recebimentos**: mostra parcelas em aberto e saldo total, sem lista de recebimentos.
- **Comprovante no disco local vs Supabase Storage**: o link de visualização/download funciona nos
  dois modos de armazenamento.
- **Venda excluída** após o link gerado: link passa a "indisponível".
- **Dono troca a chave PIX padrão**: a página reflete a chave atual do dono no momento do acesso.
- **Acesso concorrente/compartilhado**: como é só leitura, vários acessos simultâneos ao mesmo link
  são suportados.

## Requirements

### Funcionais

- **FR-001**: O dono autenticado DEVE poder gerar um link público para uma venda específica, baseado
  em um **token aleatório não-adivinhável**.
- **FR-002**: O dono DEVE poder visualizar o estado do link (ativo/revogado/expirado) e **copiá-lo**
  a partir da tela da venda.
- **FR-003**: O dono DEVE poder **revogar** o link a qualquer momento, invalidando-o imediatamente, e
  **gerar um novo** (o anterior permanece inválido).
- **FR-004**: O dono DEVE poder, opcionalmente, definir uma **data de expiração** para o link.
- **FR-005**: Qualquer pessoa com o link válido DEVE conseguir abrir a página **sem login**.
- **FR-006**: A página pública DEVE exibir, da venda em questão: valor total, total já pago, saldo
  devedor, e a lista de **parcelas** com status (paga/em aberto/atrasada) e vencimento.
- **FR-007**: A página DEVE listar os **recebimentos** (data, valor, forma) e permitir
  visualizar/baixar os **comprovantes** anexados àquela venda.
- **FR-008**: A página DEVE identificar o **devedor** (nome) e o **credor**, sem expor dados
  sensíveis adicionais.
- **FR-009**: A página **NÃO** DEVE expor dados internos (custo do produto, lucro) nem qualquer dado
  de outras vendas/clientes do dono.
- **FR-010**: O cálculo de saldo/alocação de recebimentos DEVE reaproveitar a regra já existente no
  sistema (consistência com a visão interna do dono).
- **FR-011**: Quando o dono tiver **chave PIX padrão**, a página DEVE exibi-la junto ao **valor do
  saldo** para pagamento; caso contrário, omite a seção.
- **FR-012**: Quando houver **contato do credor**, a página DEVE oferecer um botão de contato
  (WhatsApp); caso contrário, omite.
- **FR-013**: Para token inexistente/inválido/revogado/expirado, a página DEVE mostrar um aviso
  amigável de "link indisponível", **sem revelar** se a venda existe.
- **FR-014**: A visualização de comprovantes pelo link DEVE funcionar tanto com armazenamento em
  disco local quanto no Supabase Storage (respeitando o storage atual do projeto).
- **FR-015**: A página DEVE ser somente leitura — o devedor **não** registra, edita nem envia nada.

### Não-funcionais

- **NFR-001**: O token DEVE ser suficientemente aleatório para não ser adivinhável por força bruta.
- **NFR-002**: O acesso público DEVE expor **apenas** os dados da venda referenciada pelo token;
  nenhuma outra venda/cliente/usuário deve ser alcançável a partir do link.
- **NFR-003**: A página pública DEVE ser leve e abrir bem no celular.

## Key Entities

- **Link público da venda**: token aleatório associado a **uma** venda. Atributos: token, venda
  referenciada, estado (ativo/revogado), data de expiração (opcional), data de criação. Um token
  resolve para exatamente uma venda.
- **Visão pública da venda** (derivada, somente leitura): subconjunto seguro dos dados já existentes —
  total, pago, saldo, parcelas (número, valor, vencimento, status), recebimentos (data, valor, forma,
  comprovantes), nome do devedor, identificação do credor, chave PIX padrão (se houver), contato (se
  houver). **Exclui** custo/lucro e qualquer dado de outras vendas.

## Success Criteria

- **SC-001**: Com um link válido, o devedor abre a página **sem login** e vê total, pago, saldo e as
  parcelas com status em menos de 3 segundos no celular.
- **SC-002**: A página pública **nunca** mostra custo/lucro do produto nem dados de outras
  vendas/clientes (verificável inspecionando a resposta pública).
- **SC-003**: Ao revogar o link, o acesso anterior para de funcionar **imediatamente** (próximo
  carregamento mostra "indisponível").
- **SC-004**: Um link expirado/revogado/aleatório inválido leva à página de "indisponível" sem
  vazar a existência da venda.
- **SC-005**: Os comprovantes anexados à venda são visualizáveis/baixáveis pelo link nos dois modos
  de storage (disco e Supabase).
- **SC-006**: Quando há PIX padrão e contato, a página mostra ambos; quando não há, a página abre
  normalmente sem essas seções.

## Assumptions

- O escopo do link é **por venda** (decidido com o usuário); link por cliente ficou fora.
- Acesso por **token aleatório revogável** com expiração **opcional** (decidido com o usuário); sem
  login e sem confirmação de dados pelo devedor.
- Conteúdo é **somente leitura**; o devedor não envia comprovante nem registra pagamento por aqui.
- A chave **PIX padrão** e o **telefone** do credor vêm dos cadastros já existentes; se ausentes, as
  seções são omitidas.
- A identificação do credor reutiliza dados já existentes do usuário/dono (ex.: nome).
- Reutiliza-se o cálculo de saldo/alocação e o storage de comprovantes já existentes no projeto.
- Deixar a feature aberta: expiração, PIX e contato são todos opcionais.
