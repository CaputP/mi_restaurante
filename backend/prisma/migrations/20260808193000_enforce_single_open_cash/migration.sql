-- Defensa en profundidad contra aperturas concurrentes.
-- La regla se aplica por vendedor en todo el sistema, en concordancia
-- con la validación del servicio de caja.
CREATE UNIQUE INDEX "caja_unica_abierta_por_vendedor_uidx"
ON "caja" ("vendedor_id")
WHERE "estado" = 'ABIERTA';
