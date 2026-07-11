# Feature Specification: Adaptação para Loja de Eletrônicos

**Feature Branch**: `025-loja-eletronicos`

**Created**: 2026-07-10

**Status**: Draft

**Input**: User description: "Adaptar o sistema (web mobphone) para operação de loja de eletrônicos, inspirado nas telas do Mercado Phone (screenshots/), no funcionamento real da loja (casos-de-uso.md) e na planilha 'Compras de Produtos - Milhas - 2026.xlsx'. Em cada venda preciso saber meu lucro, margem etc. Fora de escopo: emissão de NF/dados fiscais, múltiplos vendedores/permissões, ordem de serviço, delivery com integrações. Todo campo novo é opcional."

## Visão geral

O dono da loja compra eletrônicos (iPhones, JBLs, TVs, tablets…) em promoções de
marketplaces (Mercado Livre, Shopee, Amazon, Magalu, FastShop, Esfera×Casas
Bahia…) usando formatos que reduzem o custo real: promoções, **milhas** e
**cashback**. Hoje esse controle vive numa planilha (≈1.000 linhas/mês): cada
compra registra pedido, conta usada, CIA, formato, valores, frete, milhas/
cashback esperados, **custo final efetivo** (valor pago − valor das milhas/
cashback), datas/status de recebimento do produto e do crédito das milhas, e os
dados de cada unidade (SN, IMEI, DANFE). Na ponta da venda, o sistema atual já
cuida do fiado ("casada" da revenda): parcelas, juros, recebimentos e cobrança.

Esta feature traz a planilha para dentro do sistema e liga as duas pontas:
**compra → estoque → venda**, para que cada venda mostre **lucro e margem
reais** (preço de venda − custo final efetivo da unidade comprada). O núcleo de
fiado permanece intacto; tudo que é novo é opcional — quem usa só o fiado
simples continua trabalhando como hoje.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar compras (a planilha vira sistema) (Priority: P1)

Como dono da loja, registro cada compra de mercadoria com os mesmos dados da
minha planilha — pedido, conta, CIA, formato, valores, frete, milhas/cashback —
e o sistema calcula o **custo final efetivo** de cada produto, somando também o
investimento do mês.

**Why this priority**: é a fonte da verdade do negócio hoje (planilha de
milhares de linhas). Sem a compra registrada não existe custo real, e sem custo
real não existe lucro por venda. Entrega valor sozinha: substitui a planilha.

**Independent Test**: cadastrar compras nos quatro formatos (normal, promoção,
milhas, cashback), conferir custo final calculado, listar/filtrar compras e ver
o total investido no mês — sem depender das demais stories.

**Acceptance Scenarios**:

1. **Given** o formulário de compra, **When** registro uma compra Shopee
   "JBL Boombox 4" por R$ 2.612,52 no Pix, formato Normal, sem frete, **Then**
   o custo final do produto é R$ 2.612,52.
2. **Given** uma compra formato Milhas com valor pago R$ 2.576,30, acúmulo 6
   milhas/real e CPM R$ 27,00, **When** salvo, **Then** o sistema calcula as
   milhas esperadas (15.457,8), o valor das milhas (R$ 417,36) e o custo final
   (R$ 2.158,94) — como na planilha.
3. **Given** uma compra formato Cashback com 13% de acúmulo, valor pago
   R$ 4.699,00 e frete R$ 9,90, **When** salvo, **Then** o custo final é o
   valor com frete menos o cashback esperado (R$ 4.098,03).
4. **Given** uma compra paga no cartão Nubank em 12×, **When** marco a opção de
   antecipação Nubank (4,5%), **Then** o sistema mostra também o custo final
   com o desconto de antecipação.
5. **Given** uma compra com quantidade 3 (ex.: fontes), **When** salvo, **Then**
   o sistema cria 3 unidades em estoque, cada uma podendo receber seu próprio
   SN/IMEI/DANFE depois.
6. **Given** compras registradas em julho, **When** abro a lista de compras
   filtrada por mês, **Then** vejo o total investido no mês (como a coluna
   "Investimento" da planilha).
7. **Given** o campo observação, **When** registro a palavra-chave da Shopee ou
   qualquer nota, **Then** ela fica pesquisável na compra.

---

### User Story 2 - Acompanhar pendências de recebimento e de milhas/cashback (Priority: P2)

Como dono da loja, vejo num só lugar o que **ainda não chegou** (produtos
comprados não recebidos) e o que **ainda não caiu** (milhas/cashback não
creditados), com as datas previstas, para cobrar marketplace e programas de
pontos sem depender de varrer a planilha.

**Why this priority**: é o segundo trabalho manual mais pesado da planilha
(colunas de previsão/data/status duplicadas para produto e milhas). Dinheiro
esquecido = prejuízo direto.

**Independent Test**: registrar compras com previsões, marcar recebimentos e
créditos, e conferir os painéis de pendência e atraso.

**Acceptance Scenarios**:

1. **Given** uma compra com previsão de recebimento 17/01, **When** o produto
   não foi marcado como recebido até essa data, **Then** ela aparece como
   pendência atrasada de produto.
2. **Given** uma compra formato Milhas com previsão de crédito 07/04, **When**
   marco "milhas creditadas" com a data real, **Then** ela sai das pendências.
3. **Given** o painel de pendências, **When** o abro, **Then** vejo separado:
   produtos não recebidos e milhas/cashback não creditados, cada um com
   contagem e valor total pendente, ordenados pelos mais atrasados.
4. **Given** uma compra recebida, **When** marco "recebido" informando SN/IMEI/
   DANFE da unidade, **Then** a unidade fica disponível para venda no estoque.

---

### User Story 3 - Vender com lucro e margem visíveis (Priority: P1)

Como dono da loja, monto a venda escolhendo unidades do estoque (ou descrição
livre, como hoje) e vejo **na hora o lucro e a margem da venda** — preço de
venda menos o custo final efetivo das unidades — inclusive depois, na lista e
no detalhe de cada venda.

**Why this priority**: pedido explícito do dono ("com cada venda eu preciso
saber meu lucro, margem e etc"). É o elo que dá sentido ao registro de compras.

**Independent Test**: com unidades em estoque, criar venda para cliente final e
para revenda ("casada" a prazo), conferir lucro/margem exibidos na prévia, no
detalhe e no resumo mensal; estoque baixado; venda antiga sem itens continua
funcionando.

**Acceptance Scenarios**:

1. **Given** uma JBL em estoque com custo final R$ 2.075,34, **When** vendo por
   R$ 2.600,00 à vista, **Then** a venda mostra lucro R$ 524,66 e margem 20,2%
   (e mark-up 25,3%) antes e depois de salvar.
2. **Given** uma venda de revenda "casada" (a prazo), **When** escolho o
   cliente tipo revenda e parcelo como no fiado atual, **Then** o lucro/margem
   consideram o total com juros e o custo final das unidades.
3. **Given** duas unidades do mesmo produto com custos finais diferentes,
   **When** adiciono uma à venda, **Then** escolho qual unidade (por SN/IMEI)
   está sendo vendida e o custo usado é o dela.
4. **Given** uma venda com itens salva, **When** consulto o estoque, **Then**
   as unidades vendidas constam como vendidas (e voltam se a venda for
   excluída).
5. **Given** o fluxo atual, **When** registro venda só com descrição livre e
   custo manual (como hoje), **Then** tudo funciona como antes — o lucro usa o
   custo informado manualmente.
6. **Given** o resumo (dashboard), **When** o abro, **Then** vejo lucro e
   margem por mês considerando o custo efetivo das unidades vendidas.
7. **Given** um comprador, **When** o marco como "cliente final" ou "revenda",
   **Then** a informação aparece no cadastro e nas vendas dele.

---

### User Story 4 - Estoque de unidades com dados do aparelho (Priority: P2)

Como dono da loja, vejo meu estoque como **unidades físicas** — cada uma com
produto, SN/IMEI, DANFE, custo final e status (aguardando recebimento,
disponível, vendida) — e encontro rápido uma unidade pelo IMEI/SN.

**Why this priority**: eletrônicos são serializados; garantia, NF ao comprador
e conferência dependem de saber exatamente qual unidade é qual.

**Independent Test**: registrar compras, receber unidades com SN/IMEI, buscar
por IMEI, conferir status ao longo de compra → recebimento → venda.

**Acceptance Scenarios**:

1. **Given** unidades em vários status, **When** abro o estoque, **Then** vejo
   contagem e valor de custo por status (aguardando, disponível, vendida) e por
   produto.
2. **Given** um IMEI, **When** busco por ele, **Then** encontro a unidade com
   sua compra de origem, custo final e (se vendida) a venda ligada a ela.
3. **Given** uma unidade disponível, **When** edito SN/IMEI/DANFE ou
   observação, **Then** os dados são atualizados sem afetar custo/venda.

---

### User Story 5 - Cadastro de cliente enriquecido (Priority: P3)

Como dono da loja, guardo mais dados do comprador — tipo (cliente final ou
revenda), CPF/CNPJ (para a nota fiscal que envio ao comprador), endereço,
Instagram e tags — sem ser obrigado a preencher nada além do nome.

**Why this priority**: apoia a venda (NF ao comprador, contato, segmentação),
mas o fluxo funciona sem esses campos.

**Independent Test**: cadastrar/editar cliente com os novos campos e busca por
CPF/tag/tipo.

**Acceptance Scenarios**:

1. **Given** o formulário de devedor, **When** preencho só o nome, **Then** o
   cadastro salva como hoje (novos campos todos opcionais).
2. **Given** clientes final e revenda cadastrados, **When** filtro a lista por
   tipo, **Then** vejo só os do tipo escolhido.
3. **Given** um cliente com CPF/CNPJ e endereço, **When** abro o detalhe,
   **Then** vejo os dados organizados para copiar na emissão externa da NF.

---

### Edge Cases

- **Compra cancelada/devolvida**: compra pode ser cancelada; unidades ainda não
  vendidas saem do estoque e o investimento do mês é ajustado. Unidade já
  vendida bloqueia o cancelamento da compra (avisa qual venda usa a unidade).
- **Milhas creditadas com valor diferente do previsto**: ao marcar o crédito, o
  valor real pode ser ajustado; o custo final da unidade e o lucro de vendas
  futuras usam o real (vendas já feitas mantêm o custo do momento da venda).
- **Venda de unidade "aguardando recebimento"**: permitida com aviso (venda
  antecipada é prática comum), mas o painel de pendências destaca.
- **Excluir venda com unidades**: devolve unidades ao estoque como disponíveis.
- **Produto editado/excluído depois da venda**: a venda preserva nome, custo e
  garantia do momento (histórico imutável).
- **Compra em conta de terceiro** (ex.: "Renan Eduardo", "Ana Flavia"): conta é
  texto livre — qualquer CPF/e-mail/nome serve.
- **Datas fora de ordem** (recebimento antes da previsão, crédito adiantado):
  aceitas sem bloqueio.
- **Duas ou mais formas de pagamento na venda**: já suportado pelo fiado atual
  (recebimentos com múltiplas formas) — permanece.
- **CPF/CNPJ inválido**: aviso não bloqueante (design aberto).
- **Página pública de venda antiga**: continua como hoje, sem seção de itens.

## Requirements *(mandatory)*

### Functional Requirements

**Compras**

- **FR-001**: O sistema DEVE permitir registrar, editar, listar e cancelar
  compras com: data, número do pedido, conta utilizada (texto livre), CIA/
  marketplace, formato (normal, promoção, milhas, cashback), produto,
  quantidade, valor por unidade, frete, forma de pagamento e banco/cartão,
  observação (inclui palavra-chave). Só data, produto, quantidade e valor são
  obrigatórios.
- **FR-002**: Para formato Milhas, o sistema DEVE calcular milhas esperadas
  (valor × acúmulo por real), valor das milhas (milhas ÷ 1.000 × CPM) e custo
  final (valor pago com frete − valor das milhas), com CPM editável por compra.
- **FR-003**: Para formato Cashback, o sistema DEVE calcular o valor do
  cashback (% sobre o valor) e o custo final (valor pago com frete − cashback).
- **FR-004**: O sistema DEVE calcular opcionalmente o custo final com
  antecipação Nubank (desconto de 4,5% configurável) para compras em cartão
  parcelado.
- **FR-005**: A lista de compras DEVE ter filtro por mês/CIA/formato/status e
  mostrar o total investido do período (equivalente à coluna "Investimento").
- **FR-006**: Cada compra com quantidade N DEVE gerar N unidades de estoque,
  cada uma herdando o custo final unitário da compra.

**Pendências**

- **FR-007**: A compra DEVE aceitar previsão e data real de recebimento do
  produto, com status derivado (não recebido, recebido, atrasado).
- **FR-008**: Compras de formato milhas/cashback DEVEM aceitar previsão e data
  real do crédito, com status derivado (não creditado, creditado, atrasado) e
  ajuste do valor realmente creditado.
- **FR-009**: O sistema DEVE oferecer um painel de pendências com produtos não
  recebidos e milhas/cashback não creditados, cada grupo com contagem, valor
  total e ordenação pelos mais atrasados.

**Estoque de unidades**

- **FR-010**: Cada unidade DEVE ter status (aguardando recebimento, disponível,
  vendida) e aceitar SN, IMEI, IMEI 2, DANFE e observação, todos opcionais.
- **FR-011**: O estoque DEVE ser pesquisável por produto, SN, IMEI e DANFE, e
  resumir contagem/custo por status e por produto.
- **FR-012**: O produto (catálogo) DEVE ter nome, e opcionalmente marca, tipo
  (aparelho/acessório/peça/outro), preço de venda sugerido, dias de garantia e
  quantidade mínima com alerta de reposição.

**Venda com lucro e margem**

- **FR-013**: A venda DEVE poder conter unidades do estoque (escolhidas por
  produto e, quando houver mais de uma, pela unidade específica via SN/IMEI),
  cada uma com preço de venda praticado e desconto opcional; vendas por
  descrição livre continuam funcionando como hoje.
- **FR-014**: O sistema DEVE exibir lucro (R$), margem (%) e mark-up (%) da
  venda — na prévia antes de salvar, no detalhe da venda e na listagem — usando
  o custo final efetivo das unidades (ou o custo manual, no fluxo livre).
- **FR-015**: Ao salvar a venda, as unidades DEVEM ser marcadas como vendidas;
  excluir a venda (ou remover a unidade) as devolve como disponíveis.
- **FR-016**: A venda a prazo de revenda ("casada") DEVE usar o fluxo de fiado
  existente (parcelas, juros, recebimentos, cobrança) sem mudanças; o lucro
  considera o total com juros.
- **FR-017**: O resumo (dashboard) DEVE mostrar lucro e margem por mês
  calculados sobre o custo efetivo, além do investimento em compras do mês.
- **FR-018**: Para unidade de produto com dias de garantia, o sistema DEVE
  calcular a data de fim (data da venda + dias) e exibi-la no detalhe da venda
  e na página pública (vendas sem itens mantêm o layout atual).

**Cliente enriquecido**

- **FR-019**: O cadastro de devedor DEVE aceitar os campos opcionais: tipo
  (cliente final/revenda), CPF/CNPJ, endereço (CEP, rua, número, bairro,
  cidade, estado, complemento), Instagram e tags livres; nome continua sendo o
  único obrigatório.
- **FR-020**: A busca/lista de devedores DEVE encontrar por nome, telefone,
  CPF/CNPJ, tag e filtrar por tipo.

**Compatibilidade e importação**

- **FR-021**: Todas as vendas, clientes e fluxos existentes DEVEM continuar
  funcionando sem migração manual.
- **FR-022**: O sistema DEVE permitir importar as compras da planilha atual
  (arquivo exportado em formato tabular), mapeando as colunas conhecidas e
  reportando linhas não importadas com motivo.

### Key Entities

- **Compra**: um pedido de mercadoria em marketplace. Data, pedido, conta, CIA,
  formato, quantidade, valores (unitário, frete, pago), acúmulo/CPM ou % de
  cashback, custo final calculado, previsões/datas/status de produto e de
  milhas/cashback, observação. Gera unidades.
- **Unidade de estoque**: uma peça física. Liga compra → produto → (eventual)
  venda. SN/IMEI/IMEI2/DANFE, custo final unitário, status.
- **Produto (catálogo)**: agrupa unidades pelo modelo (ex.: "JBL Boombox 4
  Preta"). Nome, marca, tipo, preço de venda sugerido, dias de garantia,
  quantidade mínima.
- **Item da venda**: unidade vendida numa venda, com preço praticado, desconto
  e snapshot (nome, custo, garantia) do momento da venda.
- **Devedor (cliente) — extensão**: tipo cliente final/revenda, CPF/CNPJ,
  endereço, Instagram, tags.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O dono registra uma compra formato Milhas completa em menos de
  1 minuto, com o custo final igual ao da planilha (centavo a centavo) nos
  casos de teste extraídos dela.
- **SC-002**: Toda venda com unidades exibe lucro, margem e mark-up sem nenhum
  clique adicional — na prévia, no detalhe e na lista.
- **SC-003**: O painel de pendências mostra 100% das compras não recebidas e
  dos créditos de milhas/cashback pendentes registrados, com os atrasados no
  topo.
- **SC-004**: Uma unidade é localizável por IMEI/SN em menos de 5 segundos,
  com sua compra de origem e venda (se houver).
- **SC-005**: O estoque nunca fica inconsistente: unidade vendida não pode ser
  vendida de novo; excluir venda devolve a unidade; cancelar compra remove só
  unidades não vendidas.
- **SC-006**: 100% das vendas e clientes anteriores continuam funcionando sem
  qualquer ação de migração.
- **SC-007**: A importação da planilha real de 2026 traz pelo menos 95% das
  linhas sem intervenção manual, listando as demais com motivo.
- **SC-008**: O resumo mensal exibe investimento, lucro e margem do mês que
  batem com o cálculo manual nos casos de teste.

## Assumptions

- **Custo efetivo como base do lucro**: o lucro usa o "valor final do produto"
  (pago com frete − milhas/cashback); quando houver antecipação Nubank marcada,
  usa o valor com Nubank. Vendas preservam o custo do momento da venda.
- **Milhas/cashback esperados vs. reais**: o custo final usa o esperado até o
  crédito ser confirmado; na confirmação, o valor real passa a valer para
  vendas futuras.
- **Unidade serializada**: aparelho/eletrônico é 1 unidade física por registro;
  compras com quantidade N geram N unidades (padrão da própria planilha).
- **Conta é texto livre**: contas próprias (CPF/e-mail) e de terceiros
  convivem; não há gestão de contas nesta feature.
- **CIAs e formatos configuráveis**: partem de lista inicial (Mercado Livre,
  Shopee, Amazon, Magalu, FastShop, Esfera×parceiros; Normal, Promoção, Milhas,
  Cashback) e o dono pode adicionar/remover.
- **NF ao comprador é externa**: o sistema guarda CPF/CNPJ/endereço e a DANFE
  da compra para consulta, mas não emite NF (fora de escopo).
- **Vendedor único**: o usuário logado é o vendedor.
- **Página pública**: nunca exibe custo, lucro, margem ou dados de compra — só
  itens, garantia e o que já mostra hoje.
- **Fora de escopo confirmado**: emissão de NF/dados fiscais (NCM/CFOP/CST),
  múltiplos vendedores/permissões, ordem de serviço, integrações de delivery,
  gestão de programas de milhas (saldo por programa).
- A adaptação vale para o **web app**; o app mobile (024) recebe paridade em
  feature futura.
