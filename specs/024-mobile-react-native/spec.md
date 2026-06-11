# Feature Specification: App mobile local-first (Fase 1 — sem servidor, com backup)

**Feature Branch**: `feat/024-mobile-react-native`

**Created**: 2026-06-11

**Status**: Draft

**Input**: Estudo técnico em `specs/024-mobile-react-native/estudo.md` + decisões posteriores. Pivô de arquitetura: o app mobile é **local-first standalone** — guarda **tudo no próprio aparelho** (sem banco/bucket/servidor nesta fase), **não sincroniza** com o web, **não usa login** (abre direto) e **não usa Login com Google**. Proteção contra perda de dados via **backup/restauração por arquivo** (estilo WhatsApp, porém sem OAuth do Google).

## Visão Geral

Hoje o dono do negócio (credor) controla o fiado por um app web ligado a um servidor. Esta feature entrega um **app nativo de celular (iOS/Android) que funciona sozinho, sem internet e sem servidor**: todos os dados (devedores, vendas, parcelas, recebimentos, comprovantes, chaves Pix) ficam **no próprio aparelho**. É um produto independente do web — começa **vazio** e tem sua própria base local. Para o usuário não perder nada ao trocar de celular, o app **exporta e importa um arquivo de backup** que ele guarda onde quiser (ex.: Google Drive, WhatsApp), sem o app precisar de conta Google.

A matemática de dinheiro (juros, parcelas, alocação de pagamentos) é exatamente a mesma do web, porque passa a viver em um **pacote compartilhado** usado por web e mobile — garantindo resultados idênticos mesmo com dados separados.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir o app e cadastrar quem deve, sem login e offline (Priority: P1)

O credor instala o app, abre **direto** (sem login, sem internet) e cadastra seus devedores e as vendas fiado. Tudo é salvo no aparelho na hora. Ao reabrir o app (mesmo em modo avião), os dados continuam lá.

**Why this priority**: É a fundação local-first — sem armazenamento no device funcionando offline e sem a tela inicial, não há produto. Entrega valor imediato (anotar fiado no celular, como o caderninho) e destrava o resto.

**Independent Test**: Abrir o app sem internet, cadastrar um devedor e uma venda, fechar e reabrir o app em modo avião e confirmar que devedor e venda continuam salvos.

**Acceptance Scenarios**:

1. **Given** o app recém-instalado, **When** o credor abre, **Then** entra direto na tela inicial (sem pedir login nem conta) e vê um estado vazio que o convida a cadastrar o primeiro devedor.
2. **Given** o aparelho em modo avião, **When** o credor cadastra um devedor e uma venda, **Then** ambos são salvos no dispositivo e aparecem nas listas imediatamente.
3. **Given** dados já cadastrados, **When** o credor fecha e reabre o app (offline), **Then** todos os dados continuam disponíveis.
4. **Given** o app aberto, **When** o credor consulta o resumo (a receber, recebido, lucro previsto, parcelas vencidas), **Then** os números refletem os dados locais.

---

### User Story 2 - Acompanhar e cobrar um devedor (Priority: P1)

O credor abre um devedor e vê suas vendas com parcelas (paga / parcial / em aberto / vencida), recebimentos e comprovantes. Gera a mensagem de cobrança e **compartilha pelo WhatsApp** usando o compartilhamento nativo do celular.

**Why this priority**: É o coração do uso diário — saber quem deve o quê e cobrar. O compartilhamento nativo é uma vantagem concreta do mobile.

**Independent Test**: Abrir um devedor com vendas, conferir parcelas/recebimentos, gerar a cobrança e acionar o compartilhamento nativo com a mensagem pronta.

**Acceptance Scenarios**:

1. **Given** um devedor com vendas, **When** o credor abre o detalhe, **Then** vê cada venda com suas parcelas e o status de cada parcela.
2. **Given** uma parcela vencida e não paga, **When** o credor vê o detalhe, **Then** ela aparece destacada como vencida.
3. **Given** uma venda com recebimentos, **When** o credor vê o detalhe, **Then** vê os recebimentos (valor, forma, data) e consegue abrir o comprovante anexado (arquivo local).
4. **Given** um devedor com saldo em aberto, **When** o credor toca em "Cobrar", **Then** o app abre o compartilhamento nativo com a mensagem de cobrança pronta para o WhatsApp.
5. **Given** um devedor sem telefone, **When** o credor toca em "Cobrar", **Then** a mensagem é gerada e fica disponível para copiar/compartilhar mesmo assim.

---

### User Story 3 - Registrar um recebimento com foto do comprovante (Priority: P1)

Ao receber um pagamento, o credor registra o valor, a(s) forma(s) e **anexa o comprovante tirando uma foto** (ou da galeria, ou um PDF). O arquivo é guardado no aparelho e o saldo do devedor se atualiza.

**Why this priority**: Registrar pagamento com comprovante mantém os dados corretos; a captura por câmera com arquivo salvo localmente é central no app nativo.

**Independent Test**: Em uma venda com saldo, registrar um recebimento com valor, forma e foto da câmera (offline); confirmar que o saldo cai e o comprovante abre depois.

**Acceptance Scenarios**:

1. **Given** uma venda com saldo, **When** o credor informa valor válido, escolhe a forma e tira/escolhe uma foto, **Then** o recebimento é salvo, o arquivo guardado no device e o saldo diminui.
2. **Given** um valor maior que o saldo, **When** tenta salvar, **Then** vê o máximo que pode receber e não salva.
3. **Given** duas ou mais formas, **When** informa o valor por forma, **Then** só salva se a soma por forma for igual ao valor recebido.
4. **Given** um recebimento registrado, **When** o credor estorna, **Then** o saldo volta ao que era e o estorno fica visível no histórico.
5. **Given** que o credor optou por anexar depois, **When** salva sem foto, **Then** o recebimento fica registrado e sinalizado como "sem comprovante" até anexar.

---

### User Story 4 - Registrar uma nova venda com cálculo ao vivo (Priority: P2)

O credor cadastra uma venda escolhendo o devedor, valor do produto, custo, entrada, juros (ou valor final) e número de parcelas, vendo o **cálculo ao vivo** (total, lucro previsto, valor de cada parcela) — tudo calculado **no aparelho**. Pode ajustar manualmente o valor de cada parcela.

**Why this priority**: Tela mais complexa e essencial, mas depende da base (US1) já existir; por isso P2. O cálculo roda local (sem servidor) com a mesma fórmula do web.

**Independent Test**: Criar uma venda parcelada offline vendo a prévia mudar conforme digita, personalizar o valor de uma parcela e salvar; conferir que aparece no detalhe do devedor com os mesmos números que o web calcularia.

**Acceptance Scenarios**:

1. **Given** um devedor selecionado e valores informados, **When** o credor edita produto/juros/parcelas, **Then** a prévia (total, parcelas, lucro previsto) atualiza em tempo real, calculada localmente.
2. **Given** uma prévia calculada, **When** o credor edita o valor de uma parcela, **Then** as demais se reajustam para a soma continuar igual ao total.
3. **Given** uma venda válida, **When** o credor salva, **Then** a venda é criada no device e ele é levado ao detalhe do devedor.
4. **Given** nenhum devedor cadastrado, **When** abre "nova venda", **Then** é orientado a cadastrar um devedor primeiro.

---

### User Story 5 - Backup e restauração dos dados (Priority: P2)

Para não perder nada ao trocar de aparelho ou reinstalar, o credor **exporta um arquivo de backup** (dados + comprovantes) e o guarda onde quiser (Google Drive, WhatsApp, e-mail) pelo **compartilhamento nativo**. Em outro aparelho, ele **importa** esse arquivo e recupera tudo. Nenhuma etapa exige Login com Google.

**Why this priority**: Como tudo vive só no aparelho, perder o celular = perder os dados. O backup é a rede de segurança do modelo local-first; entra logo após o núcleo de uso.

**Independent Test**: Cadastrar dados, exportar o backup, (re)instalar o app / usar outro aparelho, importar o arquivo e confirmar que devedores, vendas, parcelas, recebimentos e comprovantes voltaram intactos.

**Acceptance Scenarios**:

1. **Given** dados cadastrados, **When** o credor toca em "Exportar backup", **Then** o app gera um arquivo único (dados + comprovantes) e abre o compartilhamento nativo para ele salvar onde quiser.
2. **Given** um arquivo de backup válido, **When** o credor escolhe "Importar backup" e seleciona o arquivo, **Then** os dados são restaurados e ficam visíveis no app.
3. **Given** o app já com dados, **When** o credor importa um backup, **Then** é avisado de forma clara do que vai acontecer (ex.: substituir os dados atuais) antes de confirmar.
4. **Given** um arquivo inválido/corrompido, **When** tenta importar, **Then** vê uma mensagem de erro clara e os dados atuais permanecem intactos.
5. **Given** nenhum backup feito há muitos dias, **When** o credor abre o app, **Then** é lembrado, de forma discreta, a fazer um backup.

---

### User Story 6 - Gerenciar chaves Pix (Priority: P3)

O credor cadastra, define como padrão e remove chaves Pix (locais), usadas na mensagem de cobrança.

**Why this priority**: Apoia a cobrança e muda pouco; menor prioridade.

**Acceptance Scenarios**:

1. **Given** nenhuma chave, **When** o credor cadastra a primeira, **Then** ela vira padrão automaticamente.
2. **Given** várias chaves, **When** marca outra como padrão, **Then** só uma fica como padrão.
3. **Given** uma chave existente, **When** remove, **Then** ela some da lista.

---

### Edge Cases

- **Sem internet**: o app funciona 100% offline; nenhuma tela depende de rede para operar.
- **Trocar de aparelho / reinstalar sem backup**: os dados locais se perdem — daí a importância do lembrete de backup (US5).
- **Importar backup por cima de dados existentes**: confirmar com o usuário antes de substituir; nunca sobrescrever silenciosamente.
- **Backup corrompido/incompatível**: recusa clara, sem destruir os dados atuais.
- **Armazenamento do aparelho cheio**: ao salvar comprovante/backup, falha tratada com mensagem clara.
- **Comprovante grande**: imagens podem ser comprimidas antes de guardar para o backup não inchar.
- **Permissão de câmera/galeria negada**: mensagem explicando como liberar.
- **Valores e datas em pt-BR**: moeda em reais e datas no formato brasileiro, idênticos ao web.
- **Tema do aparelho**: respeita claro/escuro do sistema, com a mesma identidade visual do web.

## Requirements *(mandatory)*

### Functional Requirements

**Acesso e armazenamento local**
- **FR-001**: O app MUST abrir **direto**, sem login nem criação de conta, e funcionar **totalmente offline**.
- **FR-002**: O app MUST NOT usar **Login com Google** (nem OAuth do Google) em nenhuma funcionalidade.
- **FR-003**: O app MUST guardar todos os dados (devedores, vendas, parcelas, recebimentos, chaves Pix) **no próprio aparelho**, persistindo entre aberturas e reinícios.
- **FR-004**: O app MUST guardar os arquivos de comprovante (foto/PDF) **no aparelho** e permitir abri-los/visualizá-los offline.
- **FR-005**: O app MUST NOT depender de servidor/back-end nesta fase (sem sincronização com o web).

**Operações de negócio (locais, com a mesma regra do web)**
- **FR-006**: O app MUST exibir um resumo (a receber, recebido, lucro previsto, parcelas vencidas e demais totais) calculado sobre os dados locais.
- **FR-007**: O app MUST permitir CRUD de devedores e listar cada um com seu saldo (quitado x em aberto).
- **FR-008**: O app MUST exibir o detalhe de um devedor com suas vendas, parcelas (paga/parcial/em aberto/vencida), recebimentos e comprovantes.
- **FR-009**: O app MUST permitir criar venda com prévia de cálculo **ao vivo** (total, lucro previsto, valor das parcelas) e edição manual do valor de cada parcela com redistribuição automática do restante — tudo calculado localmente.
- **FR-010**: O app MUST permitir editar uma venda (descrição, custo, data) e reparcelar.
- **FR-011**: O app MUST permitir registrar recebimento com valor, uma ou mais formas, valor por forma (quando 2+), data e comprovante (foto da câmera, galeria ou PDF), com opção de anexar depois; e MUST atualizar o saldo abatendo das parcelas mais antigas primeiro.
- **FR-012**: O app MUST permitir estornar um recebimento, revertendo o saldo e registrando o estorno no histórico.
- **FR-013**: O app MUST permitir marcar/desmarcar atraso de parcela (com taxa) e editar o vencimento de uma parcela.
- **FR-014**: O app MUST permitir CRUD de chaves Pix, incluindo a chave padrão.
- **FR-015**: O app MUST gerar a mensagem de cobrança de uma venda e oferecer **compartilhamento nativo** (ex.: WhatsApp), com cópia como alternativa quando não houver telefone.
- **FR-016**: O cálculo de dinheiro (juros, parcelas, alocação de pagamentos, redistribuição) MUST usar **uma única fonte da verdade** compartilhada com o web, produzindo resultados idênticos (verificado por teste de paridade).

**Backup e restauração (sem Login com Google)**
- **FR-017**: O app MUST permitir **exportar** um arquivo de backup único contendo todos os dados e os comprovantes.
- **FR-018**: O app MUST oferecer o backup pelo **compartilhamento nativo** do aparelho, para o usuário salvá-lo onde quiser (ex.: Google Drive, WhatsApp), **sem o app autenticar em nenhum serviço Google**.
- **FR-019**: O app MUST permitir **importar** um arquivo de backup e restaurar dados + comprovantes, **confirmando com o usuário** antes de substituir dados existentes.
- **FR-020**: O app MUST validar o backup na importação e, se inválido/corrompido, recusar **sem** alterar os dados atuais.
- **FR-021**: O app SHOULD lembrar o usuário, de forma discreta, a fazer backup quando ficar muito tempo sem exportar.

**Apresentação e idioma**
- **FR-022**: O app MUST formatar moeda em reais e datas no padrão brasileiro, idênticos ao web.
- **FR-023**: O app MUST seguir a identidade visual do web (tema "fintech limpa", accent emerald) e respeitar o tema claro/escuro do sistema.
- **FR-024**: Toda tela MUST ter estados claros de carregando, vazio e erro, sem telas em branco; estados vazios devem ensinar a próxima ação.

### Key Entities *(armazenadas localmente no aparelho)*

- **Devedor (cliente)**: pessoa que compra fiado; possui saldo derivado das vendas.
- **Venda**: compra parcelada de um devedor; tem produto, custo, entrada, juros, total e parcelas.
- **Parcela**: fração de uma venda com vencimento e status derivado (paga/parcial/em aberto/vencida).
- **Recebimento**: evento imutável de pagamento (valor, formas, data) com comprovantes anexados; pode ser estornado.
- **Comprovante**: arquivo (imagem/PDF) anexado a um recebimento, guardado no aparelho.
- **Chave Pix**: chave de pagamento do credor, com uma marcada como padrão.
- **Backup**: arquivo exportável/importável que empacota todas as entidades acima + os comprovantes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O credor consegue instalar o app, abri-lo (sem login) e cadastrar o primeiro devedor + venda em menos de 3 minutos, **sem internet**.
- **SC-002**: O app opera **100% offline**: nenhuma funcionalidade da Fase 1 exige rede para funcionar.
- **SC-003**: Para os mesmos parâmetros de venda, os cálculos do app (total, parcelas, lucro previsto, alocação de pagamento) batem **100%** com os do web (teste de paridade da regra compartilhada) — **0** divergência de centavos.
- **SC-004**: O credor consegue registrar um recebimento com foto do comprovante em menos de 1 minuto, offline.
- **SC-005**: Cobrar um devedor leva no máximo 2 toques do detalhe até o compartilhamento nativo abrir com a mensagem pronta.
- **SC-006**: O credor consegue exportar um backup e, em um aparelho/instalação novo, importá-lo e recuperar **100%** dos dados e comprovantes, **sem usar conta Google**.
- **SC-007**: Importar um backup inválido **nunca** corrompe nem apaga os dados atuais (0 casos de perda).
- **SC-008**: As telas principais (inicial/resumo, devedores, detalhe do devedor, nova venda, chaves Pix, backup) estão navegáveis e funcionais offline, cada uma com estados de carregando/vazio/erro.
- **SC-009**: O app web existente continua funcionando sem nenhuma regressão após a extração da regra de cálculo compartilhada.

## Assumptions

- **Standalone local-first**: o app mobile é um produto independente; **não** usa servidor nem sincroniza com o web nesta fase. Começa com base vazia no aparelho.
- **Plataforma**: app nativo iOS/Android sobre Expo (managed) + Expo Router, conforme o estudo §3. Distribuição interna para teste no aparelho do dono.
- **Armazenamento**: dados em banco **no dispositivo** (ex.: SQLite local) e comprovantes como **arquivos locais**. **Banco de produção + bucket (Supabase) ficam para uma versão paga futura — fora do escopo.**
- **Sem login / sem Google**: o app abre direto; não há autenticação de conta e **não** se usa Login com Google em nada (inclusive no backup). Proteção por biometria/PIN do aparelho fica para fase futura.
- **Backup sem OAuth**: backup = **arquivo exportável/importável** via compartilhamento nativo (o usuário escolhe guardar no Drive/WhatsApp/etc.). No Android, o auto-backup do sistema operacional pode complementar de forma transparente, sem login no app. Sincronização automática real com a nuvem (que exigiria conta) fica fora do escopo.
- **Reúso de regras**: a matemática de dinheiro, a formatação e os tipos passam a viver em um **pacote compartilhado** consumido por web e mobile (uma fonte da verdade), com teste de paridade num só lugar. Como não há servidor, o app **calcula localmente** com essa mesma regra.
- **Usuário único** por aparelho (sem multiusuário/perfis).
- **Identidade visual**: os tokens de design já refinados do web são a referência de cores/tema.

## Out of Scope (fases seguintes)

- **Servidor / sincronização** com o web e **banco/bucket de produção** (versão paga futura).
- **Sincronização automática na nuvem** e qualquer integração que exija **conta/Login Google**.
- **Notificações push** de vencimento.
- **Biometria/PIN** para abrir o app e **deep links** de cobrança.
- Página pública da venda (existe no web; não precisa de app nativo).
</content>
