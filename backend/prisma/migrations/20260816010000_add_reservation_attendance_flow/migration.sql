ALTER TYPE "TipoDocumentoCorrelativo" ADD VALUE IF NOT EXISTS 'CONSTANCIA_RESERVA';

ALTER TABLE "caja"
  ADD COLUMN "total_adelantos" DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE "pago_reserva"
  ADD COLUMN "caja_id" UUID,
  ADD COLUMN "numero_constancia" VARCHAR(30);

CREATE INDEX "pago_reserva_numero_constancia_idx"
  ON "pago_reserva"("numero_constancia");

CREATE INDEX "pago_reserva_caja_id_estado_fecha_confirmacion_idx"
  ON "pago_reserva"("caja_id", "estado", "fecha_confirmacion");

ALTER TABLE "pago_reserva"
  ADD CONSTRAINT "pago_reserva_caja_id_fkey"
  FOREIGN KEY ("caja_id") REFERENCES "caja"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
