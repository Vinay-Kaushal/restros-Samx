/*
  Warnings:

  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebhookEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_orderId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "specialInstructions" TEXT,
ADD COLUMN     "tipAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "WebhookEvent";

-- DropEnum
DROP TYPE "PaymentProvider";

-- DropEnum
DROP TYPE "PaymentStatus";
