# Data Model — armazenamento local (SQLite) + formato de backup

Modelo **no aparelho**, espelhando o domínio do `api/` (Prisma), **menos** o que é exclusivo do servidor: **sem** `User`/auth e **sem** `SaleShareLink` (página pública é do web). O dono é único e local → dados do dono viram um registro de **configurações** (singleton). Valores em **centavos (Int)**; percentuais em Float; datas como **ISO string** (`YYYY-MM-DD` para datas de negócio).

Princípios preservados do servidor: **recebimento é evento imutável (ledger)**; **status/saldo da parcela são derivados** via `@pindurados/core/calc/allocate-receipts`, nunca gravados como verdade.

## Tabelas

### `settings` (singleton — dados do dono)
| Campo | Tipo | Notas |
|---|---|---|
| id | INTEGER PK CHECK(id=1) | linha única |
| owner_name | TEXT NULL | nome do credor (aparece na cobrança) |
| contact_phone | TEXT NULL | WhatsApp do credor |
| default_late_fee_percent | REAL DEFAULT 25 | taxa de atraso padrão |
| last_backup_at | TEXT NULL | ISO do último backup (para o lembrete US5) |

### `customers` (devedor)
| Campo | Tipo | Notas |
|---|---|---|
| id | TEXT PK | uuid gerado no device |
| name | TEXT NOT NULL | |
| phone | TEXT NULL | |
| note | TEXT NULL | |
| auto_reminder | INTEGER(bool) DEFAULT 0 | |
| created_at | TEXT NOT NULL | ISO |

### `sales` (venda)
| Campo | Tipo | Notas |
|---|---|---|
| id | TEXT PK | uuid |
| customer_id | TEXT NOT NULL FK→customers(id) ON DELETE CASCADE | |
| description | TEXT NULL | |
| type | TEXT NOT NULL DEFAULT 'AUTOMATIC' | AUTOMATIC \| MANUAL \| BY_TOTAL |
| product_value_in_cents | INTEGER NOT NULL | |
| product_cost_in_cents | INTEGER NOT NULL DEFAULT 0 | |
| down_payment_in_cents | INTEGER NOT NULL DEFAULT 0 | |
| interest_percent | REAL NOT NULL | |
| late_fee_percent | REAL NOT NULL DEFAULT 25 | |
| total_in_cents | INTEGER NOT NULL | derivado no momento da criação/edição via core |
| sale_date | TEXT NOT NULL | ISO date |
| created_at | TEXT NOT NULL | ISO |

### `installments` (parcela)
| Campo | Tipo | Notas |
|---|---|---|
| id | TEXT PK | uuid |
| sale_id | TEXT NOT NULL FK→sales(id) ON DELETE CASCADE | |
| number | INTEGER NOT NULL | |
| amount_in_cents | INTEGER NOT NULL | valor original |
| due_date | TEXT NOT NULL | ISO date |
| is_late | INTEGER(bool) DEFAULT 0 | |
| late_interest_in_cents | INTEGER DEFAULT 0 | |
| late_fee_percent | REAL NULL | |
| late_reason | TEXT NULL | |

> Status (PAID/PARTIAL/OPEN), `overdue`, `paidInCents`, `balanceInCents`, `effectiveInCents` são **derivados** (não persistidos) por `allocate-receipts` do core sobre os `receipts` da venda + a data de hoje.

### `receipts` (recebimento — evento imutável)
| Campo | Tipo | Notas |
|---|---|---|
| id | TEXT PK | uuid |
| sale_id | TEXT NOT NULL FK→sales(id) ON DELETE CASCADE | |
| amount_in_cents | INTEGER NOT NULL | negativo = estorno |
| methods | TEXT NOT NULL DEFAULT '[]' | JSON array de ReceiptMethod |
| method_amounts_in_cents | TEXT NOT NULL DEFAULT '[]' | JSON array, alinhado a methods (2+ formas) |
| received_at | TEXT NOT NULL | ISO date |
| note | TEXT NULL | |
| reverses_receipt_id | TEXT NULL FK→receipts(id) | aponta para o original quando é estorno |
| created_at | TEXT NOT NULL | ISO |

> `receiptPath` legado do servidor não é necessário: comprovantes vivem em `receipt_attachments`.

### `receipt_attachments` (comprovante)
| Campo | Tipo | Notas |
|---|---|---|
| id | TEXT PK | uuid |
| receipt_id | TEXT NOT NULL FK→receipts(id) ON DELETE CASCADE | |
| path | TEXT NOT NULL | caminho **relativo** em `comprovantes/` (no FileSystem do app) |
| method | TEXT NULL | ReceiptMethod opcional |
| mime | TEXT NULL | image/jpeg, application/pdf… |
| created_at | TEXT NOT NULL | ISO |

### `pix_keys` (chave Pix do dono)
| Campo | Tipo | Notas |
|---|---|---|
| id | TEXT PK | uuid |
| type | TEXT NOT NULL | RANDOM \| CPF \| CNPJ \| EMAIL \| PHONE |
| key | TEXT NOT NULL | |
| bank_name | TEXT NOT NULL | |
| holder_name | TEXT NOT NULL | |
| is_default | INTEGER(bool) DEFAULT 0 | só uma padrão |
| created_at | TEXT NOT NULL | ISO |

### `meta` (versão do schema local)
| Campo | Tipo | Notas |
|---|---|---|
| key | TEXT PK | ex.: 'schema_version' |
| value | TEXT | |

## Regras de derivação (via `@pindurados/core`)

- **Saldo da venda / da parcela**: `allocate-receipts(sale, installments, receipts, today)` abate dos recebimentos (positivos − estornos) nas parcelas **mais antigas primeiro**, produzindo por parcela: `paidInCents`, `balanceInCents`, `status`, `overdue`, `effectiveInCents` (inclui juros de atraso).
- **Total da venda**: `calculate-sale(...)` a partir de produto/entrada/juros/parcelas (ou valores custom + redistribute). Grava `total_in_cents` e cria as `installments`.
- **Lucro previsto**: `entrada + total − custo` (mesma fórmula do web).
- **Resumo (dashboard)**: agregações em SQL + derivação por venda (a receber, recebido, lucro previsto, parcelas vencidas, etc.).

## Formato de backup (arquivo `.pindurados`)

Arquivo único (zip) contendo:

```text
backup.pindurados (zip)
├── manifest.json        # { app: "pindurados", schemaVersion, exportedAt, counts }
├── data.json            # { settings, customers, sales, installments, receipts, receipt_attachments, pix_keys }
└── comprovantes/        # todos os arquivos referenciados por receipt_attachments.path
    └── <arquivos>
```

- **Export**: lê todas as tabelas → `data.json`; copia os arquivos de comprovante; zipa; oferece via compartilhamento nativo.
- **Import**: abre o zip; valida `manifest.json` (app + schemaVersion suportada); confirma com o usuário; em **transação**, limpa as tabelas e regrava a partir de `data.json`, restaura os arquivos para `comprovantes/`. Em erro de validação, **aborta sem tocar** nos dados atuais.
- **Versão**: `schemaVersion` permite migração futura do formato; importar versão mais nova que a suportada → recusa clara.

## Entidades fora do modelo local (intencional)

- **User / auth**: não há login local.
- **SaleShareLink**: página pública é exclusiva do web.
- **Banco de produção / bucket**: versão paga futura.
</content>
