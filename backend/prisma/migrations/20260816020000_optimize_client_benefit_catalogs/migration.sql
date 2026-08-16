-- Índices de lectura para los catálogos públicos vigentes del cliente.
CREATE INDEX "programa_fidelizacion_catalogo_cliente_idx"
ON "programa_fidelizacion"("activo", "automatico", "fecha_inicio", "fecha_fin");

CREATE INDEX "promocion_catalogo_cliente_idx"
ON "promocion"("estado", "automatica", "fecha_inicio", "fecha_fin");
