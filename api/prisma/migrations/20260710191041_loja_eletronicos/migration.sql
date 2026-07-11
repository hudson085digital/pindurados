-- CreateEnum
CREATE TYPE "CustomerKind" AS ENUM ('FINAL', 'RESALE');

-- CreateEnum
CREATE TYPE "SaleDeliveryType" AS ENUM ('PICKUP', 'DELIVERY', 'MAIL');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('DEVICE', 'ACCESSORY', 'PART', 'OTHER');

-- CreateEnum
CREATE TYPE "PurchaseFormat" AS ENUM ('NORMAL', 'PROMO', 'MILES', 'CASHBACK');

-- CreateEnum
CREATE TYPE "StockUnitStatus" AS ENUM ('AWAITING', 'AVAILABLE', 'SOLD');

-- CreateEnum
CREATE TYPE "UserOptionKind" AS ENUM ('MARKETPLACE', 'SALE_ORIGIN');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "address_city" TEXT,
ADD COLUMN     "address_complement" TEXT,
ADD COLUMN     "address_district" TEXT,
ADD COLUMN     "address_number" TEXT,
ADD COLUMN     "address_state" TEXT,
ADD COLUMN     "address_street" TEXT,
ADD COLUMN     "address_zip" TEXT,
ADD COLUMN     "cpf_cnpj" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "kind" "CustomerKind",
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "receipts" ALTER COLUMN "methods" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "delivery_type" "SaleDeliveryType",
ADD COLUMN     "origin" TEXT;

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "type" "ProductType" NOT NULL DEFAULT 'OTHER',
    "suggested_price_in_cents" INTEGER,
    "warranty_days" INTEGER,
    "min_quantity" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "order_number" TEXT,
    "account" TEXT,
    "marketplace" TEXT,
    "format" "PurchaseFormat" NOT NULL DEFAULT 'NORMAL',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_value_in_cents" INTEGER NOT NULL,
    "freight_in_cents" INTEGER NOT NULL DEFAULT 0,
    "payment_method" TEXT,
    "bank_card" TEXT,
    "accrual_per_real" DOUBLE PRECISION,
    "cpm_in_cents" INTEGER,
    "cashback_percent" DOUBLE PRECISION,
    "expected_credit_in_cents" INTEGER NOT NULL DEFAULT 0,
    "actual_credit_in_cents" INTEGER,
    "nubank_advance" BOOLEAN NOT NULL DEFAULT false,
    "nubank_discount_percent" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "product_expected_at" TIMESTAMP(3),
    "product_received_at" TIMESTAMP(3),
    "credit_expected_at" TIMESTAMP(3),
    "credit_received_at" TIMESTAMP(3),
    "note" TEXT,
    "canceled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_units" (
    "id" TEXT NOT NULL,
    "status" "StockUnitStatus" NOT NULL DEFAULT 'AWAITING',
    "final_cost_in_cents" INTEGER NOT NULL,
    "serial_number" TEXT,
    "imei1" TEXT,
    "imei2" TEXT,
    "danfe" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,

    CONSTRAINT "stock_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "price_in_cents" INTEGER NOT NULL,
    "discount_in_cents" INTEGER NOT NULL DEFAULT 0,
    "cost_snapshot_in_cents" INTEGER NOT NULL,
    "warranty_days" INTEGER,
    "warranty_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sale_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_options" (
    "id" TEXT NOT NULL,
    "kind" "UserOptionKind" NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "user_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sale_items_unit_id_key" ON "sale_items"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_options_user_id_kind_label_key" ON "user_options"("user_id", "kind", "label");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_units" ADD CONSTRAINT "stock_units_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_units" ADD CONSTRAINT "stock_units_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_units" ADD CONSTRAINT "stock_units_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "stock_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_options" ADD CONSTRAINT "user_options_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
