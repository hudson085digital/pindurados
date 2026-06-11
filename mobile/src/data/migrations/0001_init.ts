// Migration inicial — schema local (ver specs/024.../data-model.md).
// Valores em centavos (INTEGER); datas como TEXT ISO; bools como INTEGER 0/1.
export const INIT_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  owner_name TEXT,
  contact_phone TEXT,
  default_late_fee_percent REAL NOT NULL DEFAULT 25,
  last_backup_at TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  note TEXT,
  auto_reminder INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'AUTOMATIC',
  product_value_in_cents INTEGER NOT NULL,
  product_cost_in_cents INTEGER NOT NULL DEFAULT 0,
  down_payment_in_cents INTEGER NOT NULL DEFAULT 0,
  interest_percent REAL NOT NULL,
  late_fee_percent REAL NOT NULL DEFAULT 25,
  total_in_cents INTEGER NOT NULL,
  sale_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

CREATE TABLE IF NOT EXISTS installments (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  amount_in_cents INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  is_late INTEGER NOT NULL DEFAULT 0,
  late_interest_in_cents INTEGER NOT NULL DEFAULT 0,
  late_fee_percent REAL,
  late_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_installments_sale ON installments(sale_id);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  amount_in_cents INTEGER NOT NULL,
  methods TEXT NOT NULL DEFAULT '[]',
  method_amounts_in_cents TEXT NOT NULL DEFAULT '[]',
  received_at TEXT NOT NULL,
  note TEXT,
  reverses_receipt_id TEXT REFERENCES receipts(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_receipts_sale ON receipts(sale_id);

CREATE TABLE IF NOT EXISTS receipt_attachments (
  id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  method TEXT,
  mime TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attachments_receipt ON receipt_attachments(receipt_id);

CREATE TABLE IF NOT EXISTS pix_keys (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  key TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (id) VALUES (1);
`
