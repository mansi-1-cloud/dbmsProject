-- AlterTable
ALTER TABLE "tokens" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "subject" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "phoneNumber" TEXT;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "address" TEXT,
ADD COLUMN     "phoneNumber" TEXT;
