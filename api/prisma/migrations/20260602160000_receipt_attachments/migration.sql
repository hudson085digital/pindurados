-- Vários comprovantes por recebimento, cada um com forma opcional.
CREATE TABLE "receipt_attachments" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" "ReceiptMethod",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receipt_id" TEXT NOT NULL,
    CONSTRAINT "receipt_attachments_pkey" PRIMARY KEY ("id")
);

-- Migra o comprovante único existente para um anexo (sem forma).
INSERT INTO "receipt_attachments" ("id", "path", "receipt_id", "created_at")
SELECT gen_random_uuid(), "receipt_path", "id", "created_at"
FROM "receipts" WHERE "receipt_path" IS NOT NULL;

ALTER TABLE "receipt_attachments" ADD CONSTRAINT "receipt_attachments_receipt_id_fkey"
  FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
