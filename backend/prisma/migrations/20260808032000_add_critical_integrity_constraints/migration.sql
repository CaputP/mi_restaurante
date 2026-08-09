-- Las reglas críticas también se protegen en PostgreSQL para que un error
-- futuro en la aplicación no pueda persistir dinero o stock inválidos.

ALTER TABLE "pago_reserva"
  ADD CONSTRAINT "pago_reserva_monto_positivo" CHECK ("monto" > 0),
  ADD CONSTRAINT "pago_reserva_operacion_requerida" CHECK (
    "metodo_pago" = 'EFECTIVO'
    OR ("numero_operacion" IS NOT NULL AND btrim("numero_operacion") <> '')
  );

ALTER TABLE "pago_venta"
  ADD CONSTRAINT "pago_venta_monto_positivo" CHECK ("monto" > 0),
  ADD CONSTRAINT "pago_venta_operacion_requerida" CHECK (
    "metodo_pago" = 'EFECTIVO'
    OR ("numero_operacion" IS NOT NULL AND btrim("numero_operacion") <> '')
  ),
  ADD CONSTRAINT "pago_venta_efectivo_valido" CHECK (
    "metodo_pago" <> 'EFECTIVO'
    OR (
      "monto_recibido" IS NOT NULL
      AND "vuelto" IS NOT NULL
      AND "monto_recibido" >= "monto"
      AND "vuelto" >= 0
    )
  );

ALTER TABLE "reserva"
  ADD CONSTRAINT "reserva_montos_no_negativos" CHECK (
    "total_estimado" >= 0
    AND "adelanto_requerido" >= 0
    AND "adelanto_pagado" >= 0
    AND "saldo_estimado" >= 0
    AND "penalidad_cancelacion" >= 0
    AND "monto_devuelto" >= 0
  ),
  ADD CONSTRAINT "reserva_adelantos_dentro_total" CHECK (
    "adelanto_requerido" <= "total_estimado"
    AND "adelanto_pagado" <= "total_estimado"
  ),
  ADD CONSTRAINT "reserva_penalidad_dentro_pago" CHECK (
    "penalidad_cancelacion" <= "adelanto_pagado"
  );

ALTER TABLE "detalle_reserva"
  ADD CONSTRAINT "detalle_reserva_cantidades_validas" CHECK (
    "cantidad_solicitada" > 0
    AND "cantidad_aprobada" >= 0
    AND "cantidad_aprobada" <= "cantidad_solicitada"
    AND "cantidad_comprometida" >= 0
    AND "cantidad_comprometida" <= "cantidad_aprobada"
  ),
  ADD CONSTRAINT "detalle_reserva_montos_no_negativos" CHECK (
    "precio_reservado" >= 0 AND "subtotal" >= 0
  );

ALTER TABLE "stock_permanente"
  ADD CONSTRAINT "stock_permanente_cantidades_validas" CHECK (
    "cantidad_actual" >= 0
    AND "cantidad_comprometida" >= 0
    AND "cantidad_comprometida" <= "cantidad_actual"
  );

ALTER TABLE "stock_diario"
  ADD CONSTRAINT "stock_diario_cantidades_validas" CHECK (
    "cantidad_inicial" >= 0
    AND "cantidad_actual" >= 0
    AND "cantidad_comprometida" >= 0
    AND "cantidad_comprometida" <= "cantidad_actual"
  );

ALTER TABLE "producto_sucursal"
  ADD CONSTRAINT "producto_sucursal_valores_no_negativos" CHECK (
    "precio_venta" >= 0 AND "stock_minimo" >= 0
  );

ALTER TABLE "venta"
  ADD CONSTRAINT "venta_montos_no_negativos" CHECK (
    "subtotal" >= 0
    AND "descuento" >= 0
    AND "propina" >= 0
    AND "total" >= 0
    AND "adelanto_aplicado" >= 0
    AND "saldo_cobrar" >= 0
  );

ALTER TABLE "detalle_venta"
  ADD CONSTRAINT "detalle_venta_valores_validos" CHECK (
    "cantidad" > 0
    AND "precio_unitario" >= 0
    AND "subtotal" >= 0
  );

ALTER TABLE "gasto"
  ADD CONSTRAINT "gasto_monto_positivo" CHECK ("monto" > 0);
