-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "session_version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "token_verificacion_correo" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expira_at" TIMESTAMPTZ(3) NOT NULL,
    "usado_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_verificacion_correo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_recuperacion_password" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expira_at" TIMESTAMPTZ(3) NOT NULL,
    "usado_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_recuperacion_password_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "token_verificacion_correo_token_hash_key" ON "token_verificacion_correo"("token_hash");

-- CreateIndex
CREATE INDEX "token_verificacion_correo_usuario_id_expira_at_idx" ON "token_verificacion_correo"("usuario_id", "expira_at");

-- CreateIndex
CREATE INDEX "token_verificacion_correo_expira_at_usado_at_idx" ON "token_verificacion_correo"("expira_at", "usado_at");

-- CreateIndex
CREATE UNIQUE INDEX "token_recuperacion_password_token_hash_key" ON "token_recuperacion_password"("token_hash");

-- CreateIndex
CREATE INDEX "token_recuperacion_password_usuario_id_expira_at_idx" ON "token_recuperacion_password"("usuario_id", "expira_at");

-- CreateIndex
CREATE INDEX "token_recuperacion_password_expira_at_usado_at_idx" ON "token_recuperacion_password"("expira_at", "usado_at");

-- AddForeignKey
ALTER TABLE "token_verificacion_correo" ADD CONSTRAINT "token_verificacion_correo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_recuperacion_password" ADD CONSTRAINT "token_recuperacion_password_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
