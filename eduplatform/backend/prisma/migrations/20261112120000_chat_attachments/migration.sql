-- AlterTable
ALTER TABLE "Message" ADD COLUMN "attachmentFile" TEXT;
ALTER TABLE "Message" ADD COLUMN "attachmentName" TEXT;
ALTER TABLE "Message" ADD COLUMN "attachmentMime" TEXT;
ALTER TABLE "Message" ADD COLUMN "attachmentSize" INTEGER;
