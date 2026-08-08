-- CreateEnum
CREATE TYPE "EstadoCanjePremio" AS ENUM ('APLICADO', 'REVERTIDO');

-- CreateTable
CREATE TABLE "canje_premio_cliente" (
    "id" UUID NOT NULL,
    "premio_id" UUID NOT NULL,
    "venta_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "canjeado_por_id" UUID NOT NULL,
    "tipo_recompensa" "TipoRecompensa" NOT NULL,
    "descripcion" VARCHAR(250) NOT NULL,
    "monto_aplicado" DECIMAL(12,2) NOT NULL,
    "producto_premio_nombre" VARCHAR(160),
    "estado" "EstadoCanjePremio" NOT NULL DEFAULT 'APLICADO',
    "fecha_canje" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertido_at" TIMESTAMPTZ(3),
    "revertido_por_id" UUID,
    "motivo_reversion" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "canje_premio_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "canje_premio_cliente_venta_id_estado_idx" ON "canje_premio_cliente"("venta_id", "estado");

-- CreateIndex
CREATE INDEX "canje_premio_cliente_premio_id_fecha_canje_idx" ON "canje_premio_cliente"("premio_id", "fecha_canje");

-- CreateIndex
CREATE INDEX "canje_premio_cliente_cliente_id_fecha_canje_idx" ON "canje_premio_cliente"("cliente_id", "fecha_canje");

-- CreateIndex
CREATE INDEX "canje_premio_cliente_canjeado_por_id_idx" ON "canje_premio_cliente"("canjeado_por_id");

-- CreateIndex
CREATE INDEX "canje_premio_cliente_revertido_por_id_idx" ON "canje_premio_cliente"("revertido_por_id");

-- CreateIndex
CREATE UNIQUE INDEX "canje_premio_cliente_premio_id_venta_id_key" ON "canje_premio_cliente"("premio_id", "venta_id");

-- AddForeignKey
ALTER TABLE "canje_premio_cliente" ADD CONSTRAINT "canje_premio_cliente_premio_id_fkey" FOREIGN KEY ("premio_id") REFERENCES "premio_cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canje_premio_cliente" ADD CONSTRAINT "canje_premio_cliente_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canje_premio_cliente" ADD CONSTRAINT "canje_premio_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canje_premio_cliente" ADD CONSTRAINT "canje_premio_cliente_canjeado_por_id_fkey" FOREIGN KEY ("canjeado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canje_premio_cliente" ADD CONSTRAINT "canje_premio_cliente_revertido_por_id_fkey" FOREIGN KEY ("revertido_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
