/*
  Warnings:

  - You are about to drop the column `type` on the `products` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserOptionKind" ADD VALUE 'BRAND';
ALTER TYPE "UserOptionKind" ADD VALUE 'COLOR';
ALTER TYPE "UserOptionKind" ADD VALUE 'CATEGORY';
ALTER TYPE "UserOptionKind" ADD VALUE 'SUBCATEGORY';

-- AlterTable
ALTER TABLE "products" DROP COLUMN "type",
ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "product_model_id" TEXT,
ADD COLUMN     "product_type_id" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "subcategory" TEXT;

-- CreateTable
CREATE TABLE "product_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "product_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "product_type_id" TEXT NOT NULL,

    CONSTRAINT "product_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_type_fields" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "product_type_id" TEXT NOT NULL,

    CONSTRAINT "product_type_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_types_user_id_name_key" ON "product_types"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "product_models_user_id_product_type_id_name_key" ON "product_models"("user_id", "product_type_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "product_type_fields_product_type_id_label_key" ON "product_type_fields"("product_type_id", "label");

-- AddForeignKey
ALTER TABLE "product_types" ADD CONSTRAINT "product_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_models" ADD CONSTRAINT "product_models_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_models" ADD CONSTRAINT "product_models_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_type_fields" ADD CONSTRAINT "product_type_fields_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_type_fields" ADD CONSTRAINT "product_type_fields_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_product_model_id_fkey" FOREIGN KEY ("product_model_id") REFERENCES "product_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;
