# Quickstart — monorepo + app mobile local-first

Pré-requisitos: Node LTS, **pnpm**, e (para o mobile) o app **Expo Go** no celular ou um emulador. Não há servidor/banco para subir no app mobile — ele é local.

## Workspace (pnpm)

Na raiz do repo:

```bash
pnpm install            # instala todos os pacotes do workspace
pnpm -F @pindurados/core test    # testes do core (inclui PARIDADE de juros/alocação)
pnpm -F @pindurados/core build
```

Estrutura: `packages/core` (compartilhado), `api/`, `web/`, `mobile/`. `api` e `web` importam `@pindurados/core`; suas suítes continuam:

```bash
pnpm -F pindurados-api test      # api sem regressão
pnpm -F pindurados-web build     # web sem regressão
```

## App mobile (Expo)

```bash
cd mobile
pnpm install            # (já resolvido pelo workspace na raiz)
pnpm start              # abre o Expo dev server; ler o QR no Expo Go
# ou: pnpm ios / pnpm android  (emulador/simulador)
```

- **Sem login, sem internet**: o app abre direto. Os dados ficam no SQLite do app; comprovantes em `FileSystem.documentDirectory/comprovantes/`.
- **Resetar dados em dev**: apagar o app do dispositivo/emulador (limpa SQLite e arquivos) ou usar o botão de reset na tela de backup (se habilitado).

## Backup / restauração

- **Exportar**: tela *Backup* → "Exportar" → escolhe onde salvar no share sheet (Drive, WhatsApp, Files).
- **Importar**: tela *Backup* → "Importar" → seleciona o arquivo `.pindurados` → confirma a substituição.
- Nenhuma etapa pede conta Google.

## Build de teste no aparelho (EAS)

```bash
cd mobile
pnpm dlx eas-cli build --profile preview --platform android   # APK para instalar
pnpm dlx eas-cli build --profile preview --platform ios       # TestFlight
```

## Paridade de dinheiro (garantia central)

`@pindurados/core` é a fonte única da matemática. O teste de paridade (em `packages/core/test`) trava os mesmos resultados validados no `api/`. Web e mobile, ao usarem o core, não divergem um centavo. Rodar sempre que mexer em `calc/`:

```bash
pnpm -F @pindurados/core test
```
</content>
