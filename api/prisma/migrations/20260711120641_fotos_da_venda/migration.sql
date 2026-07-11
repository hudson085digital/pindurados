-- CreateTable
CREATE TABLE "sale_attachments" (
    "id" TEXT NOT NULL,
    "kind" TEXT,
    "path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sale_id" TEXT NOT NULL,

    CONSTRAINT "sale_attachments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sale_attachments" ADD CONSTRAINT "sale_attachments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
