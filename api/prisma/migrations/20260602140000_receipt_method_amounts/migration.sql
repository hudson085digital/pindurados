-- Valor por forma de pagamento (alinhado a methods; usado com 2+ formas).
ALTER TABLE "receipts" ADD COLUMN "method_amounts_in_cents" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
