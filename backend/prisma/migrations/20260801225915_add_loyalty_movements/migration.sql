-- AlterTable
ALTER TABLE "premio_cliente" ADD COLUMN     "movimiento_id" UUID;

-- CreateTable
CREATE TABLE "movimiento_fidelizacion" (
    "id" UUID NOT NULL,
    "venta_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "programa_id" UUID NOT NULL,
    "progreso_id" UUID NOT NULL,
    "visitas_aplicadas" INTEGER NOT NULL DEFAULT 0,
    "monto_aplicado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ciclos_generados" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "revertido_at" TIMESTAMPTZ(3),
    "revertido_por_id" UUID,
    "motivo_reversion" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "movimiento_fidelizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movimiento_fidelizacion_cliente_id_created_at_idx" ON "movimiento_fidelizacion"("cliente_id", "created_at");

-- CreateIndex
CREATE INDEX "movimiento_fidelizacion_programa_id_estado_idx" ON "movimiento_fidelizacion"("programa_id", "estado");

-- CreateIndex
CREATE INDEX "movimiento_fidelizacion_progreso_id_idx" ON "movimiento_fidelizacion"("progreso_id");

-- CreateIndex
CREATE INDEX "movimiento_fidelizacion_revertido_por_id_idx" ON "movimiento_fidelizacion"("revertido_por_id");

-- CreateIndex
CREATE UNIQUE INDEX "movimiento_fidelizacion_venta_id_programa_id_key" ON "movimiento_fidelizacion"("venta_id", "programa_id");

-- CreateIndex
CREATE INDEX "premio_cliente_movimiento_id_idx" ON "premio_cliente"("movimiento_id");

-- AddForeignKey
ALTER TABLE "movimiento_fidelizacion" ADD CONSTRAINT "movimiento_fidelizacion_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_fidelizacion" ADD CONSTRAINT "movimiento_fidelizacion_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_fidelizacion" ADD CONSTRAINT "movimiento_fidelizacion_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programa_fidelizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_fidelizacion" ADD CONSTRAINT "movimiento_fidelizacion_progreso_id_fkey" FOREIGN KEY ("progreso_id") REFERENCES "progreso_fidelizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_fidelizacion" ADD CONSTRAINT "movimiento_fidelizacion_revertido_por_id_fkey" FOREIGN KEY ("revertido_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premio_cliente" ADD CONSTRAINT "premio_cliente_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimiento_fidelizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
