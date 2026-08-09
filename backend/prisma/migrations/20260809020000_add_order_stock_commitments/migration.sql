ALTER TYPE "TipoMovimientoInventario" ADD VALUE 'COMPROMISO_PEDIDO';

ALTER TABLE "detalle_pedido"
  ADD COLUMN "cantidad_comprometida" DECIMAL(12,3) NOT NULL DEFAULT 0;

ALTER TABLE "detalle_pedido"
  ADD CONSTRAINT "detalle_pedido_cantidad_comprometida_check"
  CHECK (
    "cantidad_comprometida" >= 0
    AND "cantidad_comprometida" <= "cantidad"
  );
