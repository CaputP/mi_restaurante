/*
  Warnings:

  - A unique constraint covering the columns `[google_subject]` on the table `usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "google_subject" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_google_subject_key" ON "usuario"("google_subject");
