# Contract — Backup / Restauração (sem Login com Google)

Arquivo único portável `.pindurados` (zip). Export via compartilhamento nativo; import via seletor de documento. **Nenhuma etapa autentica em serviço Google.**

## Estrutura do arquivo
```text
backup.pindurados (zip)
├── manifest.json
├── data.json
└── comprovantes/<arquivos>
```

### `manifest.json`
```json
{
  "app": "pindurados",
  "schemaVersion": 1,
  "exportedAt": "2026-06-11T12:00:00.000Z",
  "counts": { "customers": 12, "sales": 30, "receipts": 41, "attachments": 38 }
}
```

### `data.json`
Objeto com uma chave por tabela (`settings`, `customers`, `sales`, `installments`, `receipts`, `receipt_attachments`, `pix_keys`), cada uma um array das linhas (mesmos campos de `data-model.md`). `receipt_attachments[].path` referencia um arquivo dentro de `comprovantes/`.

## API interna
- `exportBackup(): Promise<{ uri: string }>` — serializa tabelas, empacota comprovantes, gera o zip em `cacheDirectory`, retorna URI para `Sharing.shareAsync`. Atualiza `settings.last_backup_at`.
- `importBackup(uri): Promise<ImportResult>`:
  1. abre o zip e lê `manifest.json`;
  2. **valida**: `app === "pindurados"` e `schemaVersion ≤ suportada`; senão → erro, **sem alterar dados**;
  3. pede **confirmação** ao usuário (vai substituir os dados atuais);
  4. em **transação**: limpa tabelas, regrava de `data.json`, restaura arquivos para `comprovantes/`;
  5. em qualquer falha no meio → **rollback** (dados atuais intactos).

## Garantias
- **Sem OAuth/Google**: o app só gera/lê um arquivo; o destino (Drive, WhatsApp, Files) é escolhido pelo usuário no share sheet.
- **Não destrutivo em erro**: backup inválido/corrompido nunca apaga os dados atuais (SC-007).
- **Cross-platform**: mesmo arquivo importável em iOS e Android.
- **Complemento Android**: Auto Backup do SO habilitado (transparente, sem login no app); não substitui o export/import manual (que cobre iOS e restauração sob demanda).
- **Lembrete**: se `last_backup_at` for antigo, lembrar discretamente (US5/FR-021).
</content>
