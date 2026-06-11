# Feature Specification: App mobile nativo (Fase 1 — MVP online)

**Feature Branch**: `feat/024-mobile-react-native`

**Created**: 2026-06-11

**Status**: Draft

**Input**: Estudo técnico em `specs/024-mobile-react-native/estudo.md` (Fase 1 — MVP online). Decisões prévias: seguir com app nativo agora; extrair um pacote compartilhado de regras de dinheiro; banco/arquivos locais nesta fase (produção paga depois).

## Visão Geral

O dono do negócio (credor) hoje controla o fiado por um app web. Esta feature entrega um **app nativo de celular (iOS/Android)** que faz tudo o que o web faz **com conexão à internet**, reusando a mesma conta e os mesmos dados (mesmo servidor). O objetivo da Fase 1 é um app **navegável e funcional online**, com a vantagem de recursos nativos do celular (câmera para comprovante, compartilhar cobrança). Funcionamento offline e notificações ficam para fases seguintes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar e ver a situação do negócio no celular (Priority: P1)

O credor instala o app, faz login com a conta que já usa no web e vê imediatamente o resumo do negócio (a receber, recebido, lucro previsto, parcelas vencidas) e a lista de devedores com o saldo de cada um. A sessão permanece ativa entre aberturas do app sem precisar logar toda vez.

**Why this priority**: Sem autenticação confiável e sem o resumo + lista, não há app. É a fatia mínima que já entrega valor (consultar o negócio no bolso) e destrava todas as outras telas.

**Independent Test**: Logar no app com uma conta existente, fechar e reabrir o app (continua logado), ver o dashboard com os mesmos números do web e abrir a lista de devedores com saldos corretos.

**Acceptance Scenarios**:

1. **Given** uma conta já cadastrada, **When** o credor informa e-mail e senha corretos, **Then** ele entra e vê o dashboard.
2. **Given** credenciais inválidas, **When** tenta entrar, **Then** vê uma mensagem clara e permanece na tela de login.
3. **Given** um credor logado, **When** fecha o app e reabre depois de horas, **Then** continua logado (a sessão é renovada automaticamente) sem precisar digitar a senha de novo.
4. **Given** um credor logado, **When** abre o dashboard, **Then** vê a receber, já recebido, lucro previsto e parcelas vencidas com os mesmos valores exibidos no web.
5. **Given** um credor logado, **When** abre a lista de devedores, **Then** vê cada devedor com seu saldo (em verde quando quitado, em vermelho quando deve).
6. **Given** um credor logado, **When** toca em "Sair", **Then** a sessão é encerrada e ele volta ao login.

---

### User Story 2 - Acompanhar e cobrar um devedor (Priority: P1)

O credor abre um devedor e vê todas as vendas dele com as parcelas (paga / parcial / em aberto / vencida), o que já foi recebido e os comprovantes. Pode gerar a mensagem de cobrança e **compartilhar pelo WhatsApp** usando o compartilhamento nativo do celular.

**Why this priority**: É o coração do uso diário — saber quem deve o quê e cobrar. O compartilhamento nativo é uma vantagem concreta do mobile sobre o web.

**Independent Test**: Abrir um devedor com vendas, conferir que parcelas e recebimentos batem com o web, gerar a cobrança e acionar o compartilhamento nativo com a mensagem pronta.

**Acceptance Scenarios**:

1. **Given** um devedor com vendas, **When** o credor abre o detalhe, **Then** vê cada venda com suas parcelas e o status de cada parcela.
2. **Given** uma parcela vencida e não paga, **When** o credor vê o detalhe, **Then** ela aparece destacada como vencida.
3. **Given** uma venda com recebimentos, **When** o credor vê o detalhe, **Then** vê os recebimentos (valor, forma, data) e consegue abrir o comprovante anexado.
4. **Given** um devedor com saldo em aberto, **When** o credor toca em "Cobrar", **Then** o app abre o compartilhamento nativo com a mensagem de cobrança pronta para enviar no WhatsApp.
5. **Given** um devedor sem telefone cadastrado, **When** o credor toca em "Cobrar", **Then** a mensagem é gerada e fica disponível para copiar/compartilhar mesmo assim.

---

### User Story 3 - Registrar um recebimento com foto do comprovante (Priority: P1)

Ao receber um pagamento, o credor registra o valor, a(s) forma(s) de pagamento e **anexa o comprovante tirando uma foto com a câmera** (ou escolhendo da galeria, ou um PDF). O saldo do devedor se atualiza.

**Why this priority**: Registrar pagamento com comprovante é a ação que mantém os dados corretos; a captura por câmera é a razão prática de existir um app nativo.

**Independent Test**: Em uma venda com saldo, registrar um recebimento informando valor, forma e uma foto da câmera; confirmar que o saldo cai e o comprovante fica acessível.

**Acceptance Scenarios**:

1. **Given** uma venda com saldo em aberto, **When** o credor informa um valor válido, escolhe a forma e tira/escolhe uma foto, **Then** o recebimento é salvo e o saldo da venda diminui.
2. **Given** um valor maior que o saldo, **When** tenta salvar, **Then** vê uma mensagem dizendo o máximo que pode receber e não salva.
3. **Given** duas ou mais formas de pagamento, **When** informa o valor por forma, **Then** o app só deixa salvar se a soma por forma for igual ao valor recebido.
4. **Given** um recebimento já registrado, **When** o credor estorna, **Then** o saldo volta ao que era e o estorno fica visível no histórico.
5. **Given** que o credor optou por anexar o comprovante depois, **When** salva sem foto, **Then** o recebimento fica registrado e sinalizado como "sem comprovante" até anexar.

---

### User Story 4 - Registrar uma nova venda fiado (Priority: P2)

O credor cadastra uma venda escolhendo o devedor, valor do produto, custo, entrada, juros (ou valor final) e número de parcelas, vendo o **cálculo ao vivo** (total, lucro previsto, valor de cada parcela) antes de salvar. Pode ajustar manualmente o valor de cada parcela.

**Why this priority**: Importante e a tela mais complexa, mas o credor pode continuar criando vendas no web enquanto o restante do mobile já entrega valor; por isso P2.

**Independent Test**: Criar uma venda parcelada vendo a prévia do cálculo mudar conforme digita, personalizar o valor de uma parcela e salvar; conferir que a venda aparece no detalhe do devedor com os mesmos valores do web.

**Acceptance Scenarios**:

1. **Given** um devedor selecionado e valores informados, **When** o credor edita produto/juros/parcelas, **Then** a prévia (total, parcelas, lucro previsto) atualiza em tempo real.
2. **Given** uma prévia calculada, **When** o credor edita o valor de uma parcela, **Then** as demais se reajustam para a soma continuar igual ao total.
3. **Given** uma venda válida, **When** o credor salva, **Then** a venda é criada e ele é levado ao detalhe do devedor.
4. **Given** nenhum devedor cadastrado, **When** o credor abre "nova venda", **Then** é orientado a cadastrar um devedor primeiro.

---

### User Story 5 - Gerenciar chaves Pix (Priority: P3)

O credor cadastra, define como padrão e remove chaves Pix, que são usadas nas cobranças e na página pública da venda.

**Why this priority**: Apoia a cobrança, mas muda pouco e pode ser feito no web; menor prioridade.

**Independent Test**: Cadastrar uma chave Pix, marcá-la como padrão e removê-la; conferir que reflete no web.

**Acceptance Scenarios**:

1. **Given** nenhuma chave, **When** o credor cadastra a primeira, **Then** ela vira padrão automaticamente.
2. **Given** várias chaves, **When** o credor marca outra como padrão, **Then** só uma fica como padrão.
3. **Given** uma chave existente, **When** o credor remove, **Then** ela some da lista.

---

### Edge Cases

- **Servidor inacessível / sem internet**: como o app depende de conexão nesta fase, toda tela mostra um estado claro de erro com opção de tentar de novo, sem travar nem perder o que o usuário digitou. (Operação offline é fase futura.)
- **Sessão expirada que não pôde ser renovada**: o app leva o credor ao login de forma limpa, sem loop de erros.
- **Comprovante grande / conexão lenta**: o envio mostra progresso/estado de carregando e trata falha com possibilidade de tentar novamente.
- **Foto/arquivo**: usuário nega permissão de câmera/galeria → mensagem explicando como liberar; arquivo não suportado → recusa clara.
- **Abrir comprovante**: o arquivo precisa abrir a partir do celular (endereço acessível pelo aparelho), inclusive em ambiente de desenvolvimento.
- **Valores e datas em pt-BR**: moeda em reais e datas no formato brasileiro, idênticos ao web.
- **Tema do aparelho**: respeita claro/escuro do sistema, com a mesma identidade visual do web.

## Requirements *(mandatory)*

### Functional Requirements

**Autenticação e sessão**
- **FR-001**: O app MUST permitir login com e-mail e senha de uma conta já existente e criar conta nova.
- **FR-002**: O app MUST manter a sessão entre aberturas, renovando o acesso automaticamente em segundo plano sem exigir novo login enquanto a sessão for válida.
- **FR-003**: O app MUST guardar as credenciais de sessão de forma segura no armazenamento protegido do aparelho.
- **FR-004**: O app MUST permitir sair (encerrar a sessão) e, ao não conseguir renovar a sessão, levar o usuário ao login sem loops de erro.

**Dados e telas (paridade com o web, online)**
- **FR-005**: O app MUST exibir o dashboard com os mesmos indicadores do web (a receber, recebido, lucro previsto, parcelas vencidas e demais totais).
- **FR-006**: O app MUST listar devedores com o saldo de cada um, sinalizando quitado x em aberto.
- **FR-007**: O app MUST exibir o detalhe de um devedor com suas vendas, parcelas (paga/parcial/em aberto/vencida), recebimentos e comprovantes.
- **FR-008**: O app MUST permitir registrar recebimento com valor, uma ou mais formas de pagamento, valor por forma (quando 2+ formas) e data, atualizando o saldo.
- **FR-009**: O app MUST permitir anexar comprovante por **foto da câmera**, imagem da galeria ou arquivo PDF, e MUST permitir optar por anexar depois (sinalizando "sem comprovante").
- **FR-010**: O app MUST permitir estornar um recebimento, revertendo o saldo e registrando o estorno no histórico.
- **FR-011**: O app MUST permitir marcar/desmarcar atraso de parcela (com taxa) e editar o vencimento de uma parcela.
- **FR-012**: O app MUST permitir criar uma venda com prévia de cálculo ao vivo (total, lucro previsto, valor das parcelas) e edição manual do valor de cada parcela com redistribuição automática do restante.
- **FR-013**: O app MUST permitir editar uma venda (descrição, custo, data) e reparcelar.
- **FR-014**: O app MUST permitir CRUD de chaves Pix, incluindo definir a chave padrão.
- **FR-015**: O app MUST gerar a mensagem de cobrança de uma venda e oferecer **compartilhamento nativo** do aparelho (ex.: WhatsApp), com cópia como alternativa quando não houver telefone.
- **FR-016**: O app MUST exibir os mesmos cálculos de dinheiro do web (juros, parcelas, alocação de pagamentos), sem divergência de centavos.
- **FR-017**: O app MUST permitir abrir/visualizar o comprovante anexado a um recebimento a partir do aparelho.

**Apresentação e idioma**
- **FR-018**: O app MUST formatar moeda em reais e datas no padrão brasileiro, idênticos ao web.
- **FR-019**: O app MUST seguir a identidade visual do web (tema "fintech limpa", accent emerald) e respeitar o tema claro/escuro do sistema.
- **FR-020**: Toda tela MUST ter estados claros de carregando, vazio e erro (com opção de tentar de novo), sem telas em branco.

**Integridade dos dados (compartilhada com o web)**
- **FR-021**: A regra de cálculo de dinheiro MUST ter **uma única fonte da verdade** compartilhada, de modo que web e mobile produzam exatamente o mesmo resultado (verificado por teste de paridade).
- **FR-022**: As mudanças necessárias no servidor para suportar o app MUST ser **aditivas e retrocompatíveis** — o app web atual não pode regredir.

### Key Entities *(mesmas do sistema atual — reusadas, não recriadas)*

- **Conta (credor)**: dono do negócio que faz login; possui devedores, vendas e chaves Pix.
- **Devedor (cliente)**: pessoa que compra fiado; possui um saldo derivado das vendas.
- **Venda**: compra parcelada de um devedor; tem produto, custo, entrada, juros, total e parcelas.
- **Parcela**: fração de uma venda com vencimento e status derivado (paga/parcial/em aberto/vencida).
- **Recebimento**: evento imutável de pagamento (valor, formas, data) que pode ter comprovantes anexados e pode ser estornado.
- **Comprovante**: arquivo (imagem/PDF) anexado a um recebimento.
- **Chave Pix**: chave de pagamento do credor, com uma marcada como padrão.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O credor consegue instalar o app, logar e ver o resumo do negócio em menos de 2 minutos no primeiro uso.
- **SC-002**: Os números mostrados no app (dashboard, saldos, parcelas, totais de venda) batem **100%** com os do web para a mesma conta e os mesmos dados.
- **SC-003**: O credor consegue registrar um recebimento com foto do comprovante em menos de 1 minuto, do toque em "registrar" à confirmação.
- **SC-004**: Cobrar um devedor leva no máximo 2 toques do detalhe do devedor até o compartilhamento nativo abrir com a mensagem pronta.
- **SC-005**: Em **0** caso o app mostra divergência de centavos em relação ao web para a mesma venda (garantido por teste de paridade da regra de cálculo).
- **SC-006**: As 7 telas (login, criar conta, dashboard, devedores, detalhe do devedor, nova venda, chaves Pix) estão navegáveis e funcionais online, cada uma com estados de carregando/vazio/erro.
- **SC-007**: Reabrir o app após a sessão de acesso curta expirar **não** exige novo login enquanto a sessão longa for válida (renovação automática bem-sucedida).
- **SC-008**: O app web existente continua funcionando sem nenhuma regressão após as mudanças de servidor e a extração da regra compartilhada.

## Assumptions

- **Plataforma**: app nativo iOS/Android construído sobre Expo (managed) + Expo Router, conforme o estudo §3. Distribuição interna para teste no aparelho do próprio dono.
- **Mesmo servidor**: o app consome a API REST/JWT atual; nenhuma regra de negócio é duplicada no servidor.
- **Ambiente local nesta fase**: banco de dados e armazenamento de comprovantes são **locais** (desenvolvimento/local-first). O endereço da API e dos comprovantes deve ser acessível pelo aparelho (IP da LAN ou túnel). **Banco de produção + bucket (Supabase) ficam para uma versão paga futura — fora do escopo desta fase.**
- **Conectividade**: esta fase pressupõe internet ativa; comportamento offline (fila/sincronização) é fase futura (reaproveitando o desenho da 022).
- **Reúso de regras**: a matemática de dinheiro, a formatação e os tipos passam a viver em um pacote compartilhado consumido por servidor, web e mobile (uma fonte da verdade, com teste de paridade num só lugar).
- **Sessão mobile**: o servidor passa a devolver, para clientes mobile, as credenciais de renovação de sessão no corpo da resposta (o web segue como está). Mudança aditiva e retrocompatível.
- **Usuário único**: assume-se um dono de negócio por conta (sem multiusuário/perfis nesta fase).
- **Identidade visual**: os tokens de design já refinados do web são a referência de cores/tema.

## Out of Scope (fases seguintes)

- Operação **offline** (fila de ações, sincronização, idempotência) — reaproveita o desenho da 022.
- **Notificações push** de vencimento.
- **Biometria** para abrir o app e **deep links** de cobrança.
- **Banco de produção e bucket de arquivos** (versão paga futura).
- Página pública da venda (já existe no web; não precisa de app nativo).
</content>
