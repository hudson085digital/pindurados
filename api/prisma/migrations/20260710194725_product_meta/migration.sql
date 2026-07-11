-- AlterEnum
ALTER TYPE "UserOptionKind" ADD VALUE 'PRODUCT_FIELD';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "meta" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "stock_units" ADD COLUMN     "meta" JSONB NOT NULL DEFAULT '{}';
