-- AlterEnum
ALTER TYPE "UserOptionKind" ADD VALUE 'SALE_KIND';

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "customer_kind" TEXT,
ADD COLUMN     "sale_kind" TEXT;
