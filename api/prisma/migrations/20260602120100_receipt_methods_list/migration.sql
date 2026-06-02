-- Forma de pagamento única -> lista de formas (uma ou mais combinadas).
ALTER TABLE "receipts" ADD COLUMN "methods" "ReceiptMethod"[] NOT NULL DEFAULT ARRAY[]::"ReceiptMethod"[];

-- Preserva os dados existentes: method -> methods = [method]
UPDATE "receipts" SET "methods" = ARRAY["method"]::"ReceiptMethod"[];

ALTER TABLE "receipts" DROP COLUMN "method";
