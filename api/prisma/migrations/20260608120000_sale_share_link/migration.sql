-- Página pública do devedor (023): link compartilhável por venda + contato do credor.

-- Telefone de contato do credor (opcional) para o devedor falar no WhatsApp.
ALTER TABLE "users" ADD COLUMN "contact_phone" TEXT;

-- Link público de UMA venda (token aleatório revogável, expiração opcional).
CREATE TABLE "sale_share_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sale_id" TEXT NOT NULL,
    CONSTRAINT "sale_share_links_pkey" PRIMARY KEY ("id")
);

-- token não-adivinhável e único; uma venda tem no máximo um link.
CREATE UNIQUE INDEX "sale_share_links_token_key" ON "sale_share_links"("token");
CREATE UNIQUE INDEX "sale_share_links_sale_id_key" ON "sale_share_links"("sale_id");

ALTER TABLE "sale_share_links" ADD CONSTRAINT "sale_share_links_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
