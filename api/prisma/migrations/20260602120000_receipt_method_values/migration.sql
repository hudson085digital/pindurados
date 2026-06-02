-- Novas formas de pagamento no enum (usadas a partir da próxima migration).
ALTER TYPE "ReceiptMethod" ADD VALUE 'CARD';
ALTER TYPE "ReceiptMethod" ADD VALUE 'CREDIT';
ALTER TYPE "ReceiptMethod" ADD VALUE 'DEBIT';
