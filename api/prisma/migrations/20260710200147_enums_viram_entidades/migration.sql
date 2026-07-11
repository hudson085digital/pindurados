/*
  Warnings:

  - The `kind` column on the `customers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserOptionKind" ADD VALUE 'PRODUCT_TYPE';
ALTER TYPE "UserOptionKind" ADD VALUE 'CUSTOMER_KIND';

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "kind",
ADD COLUMN     "kind" TEXT;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'Outro';

-- DropEnum
DROP TYPE "CustomerKind";

-- DropEnum
DROP TYPE "ProductType";
