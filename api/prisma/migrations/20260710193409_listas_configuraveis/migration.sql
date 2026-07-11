/*
  Warnings:

  - The `delivery_type` column on the `sales` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReceiptMethod" ADD VALUE 'BOLETO';
ALTER TYPE "ReceiptMethod" ADD VALUE 'TRANSFER';
ALTER TYPE "ReceiptMethod" ADD VALUE 'OTHER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserOptionKind" ADD VALUE 'PAYMENT_METHOD';
ALTER TYPE "UserOptionKind" ADD VALUE 'DELIVERY_TYPE';
ALTER TYPE "UserOptionKind" ADD VALUE 'PURCHASE_FORMAT';

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "format_label" TEXT;

-- AlterTable
ALTER TABLE "sales" DROP COLUMN "delivery_type",
ADD COLUMN     "delivery_type" TEXT;

-- AlterTable
ALTER TABLE "user_options" ADD COLUMN     "meta" TEXT;

-- DropEnum
DROP TYPE "SaleDeliveryType";
