/*
  Warnings:

  - The `phoneNumber` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `phoneNumber` column on the `vendors` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "phoneNumber",
ADD COLUMN     "phoneNumber" INTEGER;

-- AlterTable
ALTER TABLE "vendors" DROP COLUMN "phoneNumber",
ADD COLUMN     "phoneNumber" INTEGER;
