/*
  Warnings:

  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ReceiptMethod" AS ENUM ('PIX', 'CASH');

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_installment_id_fkey";

-- DropTable
DROP TABLE "payments";

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "amount_in_cents" INTEGER NOT NULL,
    "method" "ReceiptMethod" NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "receipt_path" TEXT,
    "reverses_receipt_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sale_id" TEXT NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
