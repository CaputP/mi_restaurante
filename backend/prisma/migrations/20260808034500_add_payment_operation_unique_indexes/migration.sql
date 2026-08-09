-- Evita duplicados dentro de cada origen incluso si se escribe fuera de la API.
-- La exclusión cruzada entre venta y reserva se protege además con un advisory
-- lock transaccional compartido en la aplicación.

CREATE UNIQUE INDEX "pago_reserva_operacion_activa_key"
  ON "pago_reserva" (upper(btrim("numero_operacion")))
  WHERE "numero_operacion" IS NOT NULL
    AND "estado" <> 'ANULADO'::"EstadoPago";

CREATE UNIQUE INDEX "pago_venta_operacion_activa_key"
  ON "pago_venta" (upper(btrim("numero_operacion")))
  WHERE "numero_operacion" IS NOT NULL
    AND "estado" <> 'ANULADO'::"EstadoPago";
