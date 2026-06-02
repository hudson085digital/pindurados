-- CreateEnum
CREATE TYPE "PixKeyType" AS ENUM ('RANDOM', 'CPF', 'CNPJ', 'EMAIL', 'PHONE');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "auto_reminder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "product_cost_in_cents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "pix_keys" (
    "id" TEXT NOT NULL,
    "type" "PixKeyType" NOT NULL,
    "key" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "holder_name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "pix_keys_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pix_keys" ADD CONSTRAINT "pix_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
