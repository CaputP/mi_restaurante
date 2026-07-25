-- CreateEnum
CREATE TYPE "EstadoRegistro" AS ENUM ('ACTIVO', 'INACTIVO', 'ARCHIVADO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "ProveedorAuth" AS ENUM ('LOCAL', 'GOOGLE', 'AMBOS');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');

-- CreateEnum
CREATE TYPE "TipoStock" AS ENUM ('DIARIO', 'PERMANENTE', 'SIN_CONTROL');

-- CreateEnum
CREATE TYPE "DestinoPreparacion" AS ENUM ('COCINA', 'BARRA', 'NINGUNO');

-- CreateEnum
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('ENTRADA_COMPRA', 'AJUSTE_ENTRADA', 'AJUSTE_SALIDA', 'PERDIDA', 'VENCIMIENTO', 'VENTA', 'ANULACION_VENTA', 'COMPROMISO_RESERVA', 'LIBERACION_RESERVA', 'CONSUMO_INTERNO');

-- CreateEnum
CREATE TYPE "TipoReserva" AS ENUM ('NORMAL', 'EVENTO', 'SOLO_ZONA');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('SOLICITADA', 'EN_REVISION', 'ESPERANDO_ADELANTO', 'CONFIRMADA', 'RECHAZADA', 'CANCELADA', 'ATENDIDA', 'NO_ASISTIO');

-- CreateEnum
CREATE TYPE "EstadoDetalleReserva" AS ENUM ('SOLICITADO', 'APROBADO', 'RECHAZADO', 'COMPROMETIDO', 'LIBERADO', 'CONSUMIDO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'RECHAZADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoPedido" AS ENUM ('CONSUMO_LOCAL', 'PARA_LLEVAR', 'RESERVA', 'EVENTO');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('ABIERTO', 'ENVIADO', 'EN_PREPARACION', 'LISTO', 'ENTREGA_PARCIAL', 'ENTREGADO', 'PAGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoDetallePedido" AS ENUM ('PENDIENTE', 'ENVIADO', 'PREPARANDO', 'LISTO', 'ENTREGA_PARCIAL', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "DestinoComanda" AS ENUM ('COCINA', 'BARRA');

-- CreateEnum
CREATE TYPE "PrioridadComanda" AS ENUM ('NORMAL', 'URGENTE', 'EVENTO');

-- CreateEnum
CREATE TYPE "EstadoComanda" AS ENUM ('PENDIENTE', 'PREPARANDO', 'LISTA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoDetalleComanda" AS ENUM ('PENDIENTE', 'PREPARANDO', 'LISTO', 'RECHAZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoEntrega" AS ENUM ('PARCIAL', 'COMPLETA');

-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('PENDIENTE', 'RETIRADA', 'ENTREGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('CONFIRMADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoCaja" AS ENUM ('ABIERTA', 'CERRADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoGasto" AS ENUM ('REGISTRADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoProgramaFidelizacion" AS ENUM ('VISITAS', 'MONTO_CONSUMIDO', 'AMBOS');

-- CreateEnum
CREATE TYPE "TipoRecompensa" AS ENUM ('PRODUCTO_GRATIS', 'DESCUENTO_FIJO', 'DESCUENTO_PORCENTAJE', 'BENEFICIO');

-- CreateEnum
CREATE TYPE "EstadoPremio" AS ENUM ('DISPONIBLE', 'CANJEADO', 'VENCIDO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoPromocion" AS ENUM ('DESCUENTO_FIJO', 'DESCUENTO_PORCENTAJE', 'PRODUCTO_GRATIS', 'COMBO');

-- CreateEnum
CREATE TYPE "EstadoPromocion" AS ENUM ('BORRADOR', 'ACTIVA', 'PAUSADA', 'FINALIZADA', 'ARCHIVADA');

-- CreateEnum
CREATE TYPE "TipoDatoConfiguracion" AS ENUM ('TEXTO', 'ENTERO', 'DECIMAL', 'BOOLEANO', 'JSON', 'FECHA', 'HORA');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('STOCK_BAJO', 'RESERVA_PENDIENTE', 'RESERVA_CONFIRMADA', 'PEDIDO_LISTO', 'CAJA_ABIERTA', 'CAJA_PENDIENTE_CIERRE', 'PREMIO_DISPONIBLE', 'RESPALDO', 'SISTEMA');

-- CreateEnum
CREATE TYPE "PrioridadNotificacion" AS ENUM ('BAJA', 'NORMAL', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "TipoDocumentoCorrelativo" AS ENUM ('RESERVA', 'PEDIDO', 'COMANDA', 'TICKET', 'CAJA', 'GASTO');

-- CreateEnum
CREATE TYPE "TipoRespaldo" AS ENUM ('AUTOMATICO', 'MANUAL');

-- CreateEnum
CREATE TYPE "EstadoRespaldo" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'FALLIDO');

-- CreateTable
CREATE TABLE "sucursal" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "razon_social" VARCHAR(200),
    "ruc" VARCHAR(20),
    "direccion" VARCHAR(250) NOT NULL,
    "telefono" VARCHAR(30),
    "correo" VARCHAR(160),
    "zona_horaria" VARCHAR(60) NOT NULL DEFAULT 'America/Lima',
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zona" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "capacidad_referencial" INTEGER,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "zona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horario_atencion" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "dia_semana" "DiaSemana" NOT NULL,
    "hora_inicio" TIME(0) NOT NULL,
    "hora_fin" TIME(0) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "horario_atencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueo_disponibilidad" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "zona_id" UUID,
    "creado_por_id" UUID NOT NULL,
    "fecha_inicio" TIMESTAMPTZ(3) NOT NULL,
    "fecha_fin" TIMESTAMPTZ(3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bloqueo_disponibilidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permiso" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(80) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "modulo" VARCHAR(80) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_permiso" (
    "rol_id" UUID NOT NULL,
    "permiso_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rol_permiso_pkey" PRIMARY KEY ("rol_id","permiso_id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "rol_id" UUID NOT NULL,
    "nombres" VARCHAR(120) NOT NULL,
    "apellidos" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(30),
    "correo" VARCHAR(160) NOT NULL,
    "password_hash" VARCHAR(255),
    "google_id" VARCHAR(255),
    "proveedor_auth" "ProveedorAuth" NOT NULL DEFAULT 'LOCAL',
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "correo_verificado" BOOLEAN NOT NULL DEFAULT false,
    "ultimo_acceso" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_sucursal" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_inicio" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuario_sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidad_medida" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "abreviatura" VARCHAR(15) NOT NULL,
    "decimales" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "unidad_medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto" (
    "id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "unidad_medida_id" UUID NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "tipo_stock" "TipoStock" NOT NULL,
    "requiere_preparacion" BOOLEAN NOT NULL DEFAULT false,
    "destino_preparacion" "DestinoPreparacion" NOT NULL DEFAULT 'NINGUNO',
    "permite_cortesia" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_sucursal" (
    "id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "precio_venta" DECIMAL(12,2) NOT NULL,
    "stock_minimo" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "disponible_venta" BOOLEAN NOT NULL DEFAULT true,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "producto_sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_permanente" (
    "id" UUID NOT NULL,
    "producto_sucursal_id" UUID NOT NULL,
    "cantidad_actual" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "cantidad_comprometida" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stock_permanente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_diario" (
    "id" UUID NOT NULL,
    "producto_sucursal_id" UUID NOT NULL,
    "creado_por_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "cantidad_inicial" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "cantidad_actual" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "cantidad_comprometida" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stock_diario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_inventario" (
    "id" UUID NOT NULL,
    "producto_sucursal_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "tipo_movimiento" "TipoMovimientoInventario" NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "cantidad_anterior" DECIMAL(12,3) NOT NULL,
    "cantidad_resultante" DECIMAL(12,3) NOT NULL,
    "costo_unitario" DECIMAL(12,2),
    "costo_total" DECIMAL(12,2),
    "motivo" TEXT NOT NULL,
    "referencia_tipo" VARCHAR(60),
    "referencia_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserva" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "cliente_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "zona_id" UUID NOT NULL,
    "tipo_reserva" "TipoReserva" NOT NULL,
    "fecha_reserva" DATE NOT NULL,
    "hora_reserva" TIME(0) NOT NULL,
    "cantidad_personas" INTEGER NOT NULL,
    "nombre_evento" VARCHAR(180),
    "observaciones" TEXT,
    "total_estimado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "adelanto_requerido" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "adelanto_pagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldo_estimado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'SOLICITADA',
    "aprobado_por_id" UUID,
    "fecha_aprobacion" TIMESTAMPTZ(3),
    "cancelado_por_id" UUID,
    "fecha_cancelacion" TIMESTAMPTZ(3),
    "motivo_cancelacion" TEXT,
    "penalidad_cancelacion" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monto_devuelto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_reserva" (
    "id" UUID NOT NULL,
    "reserva_id" UUID NOT NULL,
    "producto_sucursal_id" UUID NOT NULL,
    "nombre_producto" VARCHAR(150) NOT NULL,
    "cantidad_solicitada" DECIMAL(12,3) NOT NULL,
    "cantidad_aprobada" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "cantidad_comprometida" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "precio_reservado" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "estado" "EstadoDetalleReserva" NOT NULL DEFAULT 'SOLICITADO',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "detalle_reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago_reserva" (
    "id" UUID NOT NULL,
    "reserva_id" UUID NOT NULL,
    "registrado_por_id" UUID NOT NULL,
    "confirmado_por_id" UUID,
    "metodo_pago" "MetodoPago" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "numero_operacion" VARCHAR(100),
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_pago" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_confirmacion" TIMESTAMPTZ(3),
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pago_reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_reserva" (
    "id" UUID NOT NULL,
    "reserva_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "estado_anterior" "EstadoReserva",
    "estado_nuevo" "EstadoReserva" NOT NULL,
    "observacion" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "reserva_id" UUID,
    "cliente_id" UUID,
    "vendedor_id" UUID NOT NULL,
    "mozo_id" UUID,
    "zona_id" UUID,
    "tipo_pedido" "TipoPedido" NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'ABIERTO',
    "observaciones" TEXT,
    "enviado_at" TIMESTAMPTZ(3),
    "pagado_at" TIMESTAMPTZ(3),
    "cancelado_at" TIMESTAMPTZ(3),
    "cancelado_por_id" UUID,
    "motivo_cancelacion" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_pedido" (
    "id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "producto_sucursal_id" UUID NOT NULL,
    "nombre_producto" VARCHAR(150) NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "observaciones" TEXT,
    "estado" "EstadoDetallePedido" NOT NULL DEFAULT 'PENDIENTE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "detalle_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comanda" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "procesado_por_id" UUID,
    "destino" "DestinoComanda" NOT NULL,
    "prioridad" "PrioridadComanda" NOT NULL DEFAULT 'NORMAL',
    "estado" "EstadoComanda" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_inicio" TIMESTAMPTZ(3),
    "fecha_finalizacion" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "comanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_comanda" (
    "id" UUID NOT NULL,
    "comanda_id" UUID NOT NULL,
    "detalle_pedido_id" UUID NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "observaciones" TEXT,
    "estado" "EstadoDetalleComanda" NOT NULL DEFAULT 'PENDIENTE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "detalle_comanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrega_pedido" (
    "id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "mozo_id" UUID NOT NULL,
    "tipo_entrega" "TipoEntrega" NOT NULL,
    "estado" "EstadoEntrega" NOT NULL DEFAULT 'PENDIENTE',
    "codigo_validacion" VARCHAR(20) NOT NULL,
    "fecha_retiro" TIMESTAMPTZ(3),
    "fecha_entrega" TIMESTAMPTZ(3),
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "entrega_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_entrega" (
    "id" UUID NOT NULL,
    "entrega_pedido_id" UUID NOT NULL,
    "detalle_pedido_id" UUID NOT NULL,
    "cantidad_entregada" DECIMAL(12,3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detalle_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caja" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "vendedor_id" UUID NOT NULL,
    "abierta_por_id" UUID NOT NULL,
    "cerrada_por_id" UUID,
    "monto_inicial" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_ventas" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_efectivo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_yape" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_plin" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_tarjeta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_transferencia" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_gastos_caja" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "efectivo_esperado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "efectivo_contado" DECIMAL(12,2),
    "diferencia" DECIMAL(12,2),
    "estado" "EstadoCaja" NOT NULL DEFAULT 'ABIERTA',
    "fecha_apertura" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_cierre" TIMESTAMPTZ(3),
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta" (
    "id" UUID NOT NULL,
    "numero_ticket" VARCHAR(30) NOT NULL,
    "pedido_id" UUID NOT NULL,
    "cliente_id" UUID,
    "sucursal_id" UUID NOT NULL,
    "vendedor_id" UUID NOT NULL,
    "caja_id" UUID NOT NULL,
    "nombre_cliente" VARCHAR(200),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "propina" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "adelanto_aplicado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldo_cobrar" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'CONFIRMADA',
    "observaciones" TEXT,
    "anulada_at" TIMESTAMPTZ(3),
    "anulada_por_id" UUID,
    "motivo_anulacion" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_venta" (
    "id" UUID NOT NULL,
    "venta_id" UUID NOT NULL,
    "producto_sucursal_id" UUID NOT NULL,
    "nombre_producto" VARCHAR(150) NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detalle_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago_venta" (
    "id" UUID NOT NULL,
    "venta_id" UUID NOT NULL,
    "metodo_pago" "MetodoPago" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "numero_operacion" VARCHAR(100),
    "monto_recibido" DECIMAL(12,2),
    "vuelto" DECIMAL(12,2),
    "estado" "EstadoPago" NOT NULL DEFAULT 'CONFIRMADO',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pago_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria_gasto" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categoria_gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gasto" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "categoria_gasto_id" UUID NOT NULL,
    "administrador_id" UUID NOT NULL,
    "caja_id" UUID,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo_pago" "MetodoPago" NOT NULL,
    "salio_de_caja" BOOLEAN NOT NULL DEFAULT false,
    "comprobante_url" VARCHAR(500),
    "fecha_gasto" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoGasto" NOT NULL DEFAULT 'REGISTRADO',
    "anulado_por_id" UUID,
    "anulado_at" TIMESTAMPTZ(3),
    "motivo_anulacion" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programa_fidelizacion" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID,
    "creado_por_id" UUID NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoProgramaFidelizacion" NOT NULL,
    "visitas_requeridas" INTEGER,
    "monto_requerido" DECIMAL(12,2),
    "tipo_recompensa" "TipoRecompensa" NOT NULL,
    "producto_premio_id" UUID,
    "cantidad_premio" DECIMAL(12,3),
    "monto_descuento" DECIMAL(12,2),
    "porcentaje_descuento" DECIMAL(5,2),
    "descripcion_beneficio" VARCHAR(250),
    "vigencia_dias_premio" INTEGER NOT NULL DEFAULT 30,
    "automatico" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "programa_fidelizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progreso_fidelizacion" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "programa_id" UUID NOT NULL,
    "visitas_acumuladas" INTEGER NOT NULL DEFAULT 0,
    "monto_acumulado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ciclos_completados" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "progreso_fidelizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premio_cliente" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "programa_id" UUID NOT NULL,
    "producto_premio_id" UUID,
    "venta_canje_id" UUID,
    "canjeado_por_id" UUID,
    "descripcion" VARCHAR(250) NOT NULL,
    "cantidad_producto" DECIMAL(12,3),
    "valor_referencia" DECIMAL(12,2),
    "estado" "EstadoPremio" NOT NULL DEFAULT 'DISPONIBLE',
    "fecha_obtencion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMPTZ(3) NOT NULL,
    "fecha_canje" TIMESTAMPTZ(3),
    "motivo_anulacion" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "premio_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promocion" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID,
    "creado_por_id" UUID NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoPromocion" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "consumo_minimo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "automatica" BOOLEAN NOT NULL DEFAULT true,
    "acumulable" BOOLEAN NOT NULL DEFAULT false,
    "maximo_usos" INTEGER,
    "usos_actuales" INTEGER NOT NULL DEFAULT 0,
    "fecha_inicio" TIMESTAMPTZ(3) NOT NULL,
    "fecha_fin" TIMESTAMPTZ(3) NOT NULL,
    "estado" "EstadoPromocion" NOT NULL DEFAULT 'BORRADOR',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "promocion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promocion_producto" (
    "promocion_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promocion_producto_pkey" PRIMARY KEY ("promocion_id","producto_id")
);

-- CreateTable
CREATE TABLE "venta_promocion" (
    "id" UUID NOT NULL,
    "venta_id" UUID NOT NULL,
    "promocion_id" UUID NOT NULL,
    "descripcion" VARCHAR(250) NOT NULL,
    "monto_descuento" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venta_promocion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_sistema" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID,
    "actualizado_por_id" UUID NOT NULL,
    "clave" VARCHAR(120) NOT NULL,
    "clave_unica" VARCHAR(250) NOT NULL,
    "valor" JSONB NOT NULL,
    "tipo_dato" "TipoDatoConfiguracion" NOT NULL,
    "descripcion" TEXT,
    "editable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "configuracion_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID,
    "usuario_id" UUID,
    "rol_id" UUID,
    "tipo" "TipoNotificacion" NOT NULL,
    "prioridad" "PrioridadNotificacion" NOT NULL DEFAULT 'NORMAL',
    "titulo" VARCHAR(180) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "entidad" VARCHAR(80),
    "entidad_id" UUID,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fecha_lectura" TIMESTAMPTZ(3),
    "expira_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "sucursal_id" UUID,
    "accion" VARCHAR(100) NOT NULL,
    "modulo" VARCHAR(100) NOT NULL,
    "entidad" VARCHAR(100) NOT NULL,
    "entidad_id" UUID,
    "descripcion" TEXT NOT NULL,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "direccion_ip" VARCHAR(64),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correlativo" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "tipo_documento" "TipoDocumentoCorrelativo" NOT NULL,
    "prefijo" VARCHAR(15) NOT NULL,
    "ultimo_numero" BIGINT NOT NULL DEFAULT 0,
    "longitud_numero" INTEGER NOT NULL DEFAULT 6,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "correlativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respaldo" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID,
    "solicitado_por_id" UUID,
    "tipo" "TipoRespaldo" NOT NULL,
    "estado" "EstadoRespaldo" NOT NULL DEFAULT 'PENDIENTE',
    "nombre_archivo" VARCHAR(250),
    "ruta_archivo" VARCHAR(500),
    "tamano_bytes" BIGINT,
    "checksum" VARCHAR(128),
    "fecha_inicio" TIMESTAMPTZ(3),
    "fecha_fin" TIMESTAMPTZ(3),
    "mensaje_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "respaldo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sucursal_codigo_key" ON "sucursal"("codigo");

-- CreateIndex
CREATE INDEX "sucursal_estado_idx" ON "sucursal"("estado");

-- CreateIndex
CREATE INDEX "zona_sucursal_id_estado_idx" ON "zona"("sucursal_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "zona_sucursal_id_nombre_key" ON "zona"("sucursal_id", "nombre");

-- CreateIndex
CREATE INDEX "horario_atencion_sucursal_id_dia_semana_activo_idx" ON "horario_atencion"("sucursal_id", "dia_semana", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "horario_atencion_sucursal_id_dia_semana_hora_inicio_hora_fi_key" ON "horario_atencion"("sucursal_id", "dia_semana", "hora_inicio", "hora_fin");

-- CreateIndex
CREATE INDEX "bloqueo_disponibilidad_sucursal_id_fecha_inicio_fecha_fin_idx" ON "bloqueo_disponibilidad"("sucursal_id", "fecha_inicio", "fecha_fin");

-- CreateIndex
CREATE INDEX "bloqueo_disponibilidad_zona_id_fecha_inicio_fecha_fin_idx" ON "bloqueo_disponibilidad"("zona_id", "fecha_inicio", "fecha_fin");

-- CreateIndex
CREATE INDEX "bloqueo_disponibilidad_estado_idx" ON "bloqueo_disponibilidad"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "rol_codigo_key" ON "rol"("codigo");

-- CreateIndex
CREATE INDEX "rol_activo_idx" ON "rol"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "permiso_codigo_key" ON "permiso"("codigo");

-- CreateIndex
CREATE INDEX "permiso_modulo_activo_idx" ON "permiso"("modulo", "activo");

-- CreateIndex
CREATE INDEX "rol_permiso_permiso_id_idx" ON "rol_permiso"("permiso_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_google_id_key" ON "usuario"("google_id");

-- CreateIndex
CREATE INDEX "usuario_rol_id_estado_idx" ON "usuario"("rol_id", "estado");

-- CreateIndex
CREATE INDEX "usuario_apellidos_nombres_idx" ON "usuario"("apellidos", "nombres");

-- CreateIndex
CREATE INDEX "usuario_sucursal_sucursal_id_activo_idx" ON "usuario_sucursal"("sucursal_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_sucursal_usuario_id_sucursal_id_key" ON "usuario_sucursal"("usuario_id", "sucursal_id");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_nombre_key" ON "categoria"("nombre");

-- CreateIndex
CREATE INDEX "categoria_estado_idx" ON "categoria"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "unidad_medida_codigo_key" ON "unidad_medida"("codigo");

-- CreateIndex
CREATE INDEX "unidad_medida_activo_idx" ON "unidad_medida"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "producto_codigo_key" ON "producto"("codigo");

-- CreateIndex
CREATE INDEX "producto_categoria_id_estado_idx" ON "producto"("categoria_id", "estado");

-- CreateIndex
CREATE INDEX "producto_nombre_idx" ON "producto"("nombre");

-- CreateIndex
CREATE INDEX "producto_tipo_stock_idx" ON "producto"("tipo_stock");

-- CreateIndex
CREATE INDEX "producto_sucursal_sucursal_id_disponible_venta_estado_idx" ON "producto_sucursal"("sucursal_id", "disponible_venta", "estado");

-- CreateIndex
CREATE INDEX "producto_sucursal_producto_id_idx" ON "producto_sucursal"("producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "producto_sucursal_producto_id_sucursal_id_key" ON "producto_sucursal"("producto_id", "sucursal_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_permanente_producto_sucursal_id_key" ON "stock_permanente"("producto_sucursal_id");

-- CreateIndex
CREATE INDEX "stock_diario_fecha_idx" ON "stock_diario"("fecha");

-- CreateIndex
CREATE INDEX "stock_diario_creado_por_id_idx" ON "stock_diario"("creado_por_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_diario_producto_sucursal_id_fecha_key" ON "stock_diario"("producto_sucursal_id", "fecha");

-- CreateIndex
CREATE INDEX "movimiento_inventario_producto_sucursal_id_created_at_idx" ON "movimiento_inventario"("producto_sucursal_id", "created_at");

-- CreateIndex
CREATE INDEX "movimiento_inventario_usuario_id_created_at_idx" ON "movimiento_inventario"("usuario_id", "created_at");

-- CreateIndex
CREATE INDEX "movimiento_inventario_tipo_movimiento_created_at_idx" ON "movimiento_inventario"("tipo_movimiento", "created_at");

-- CreateIndex
CREATE INDEX "movimiento_inventario_referencia_tipo_referencia_id_idx" ON "movimiento_inventario"("referencia_tipo", "referencia_id");

-- CreateIndex
CREATE INDEX "reserva_cliente_id_created_at_idx" ON "reserva"("cliente_id", "created_at");

-- CreateIndex
CREATE INDEX "reserva_sucursal_id_fecha_reserva_estado_idx" ON "reserva"("sucursal_id", "fecha_reserva", "estado");

-- CreateIndex
CREATE INDEX "reserva_zona_id_fecha_reserva_hora_reserva_idx" ON "reserva"("zona_id", "fecha_reserva", "hora_reserva");

-- CreateIndex
CREATE INDEX "reserva_estado_idx" ON "reserva"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "reserva_sucursal_id_codigo_key" ON "reserva"("sucursal_id", "codigo");

-- CreateIndex
CREATE INDEX "detalle_reserva_producto_sucursal_id_idx" ON "detalle_reserva"("producto_sucursal_id");

-- CreateIndex
CREATE INDEX "detalle_reserva_reserva_id_estado_idx" ON "detalle_reserva"("reserva_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "detalle_reserva_reserva_id_producto_sucursal_id_key" ON "detalle_reserva"("reserva_id", "producto_sucursal_id");

-- CreateIndex
CREATE INDEX "pago_reserva_reserva_id_estado_idx" ON "pago_reserva"("reserva_id", "estado");

-- CreateIndex
CREATE INDEX "pago_reserva_metodo_pago_numero_operacion_idx" ON "pago_reserva"("metodo_pago", "numero_operacion");

-- CreateIndex
CREATE INDEX "pago_reserva_registrado_por_id_idx" ON "pago_reserva"("registrado_por_id");

-- CreateIndex
CREATE INDEX "pago_reserva_confirmado_por_id_idx" ON "pago_reserva"("confirmado_por_id");

-- CreateIndex
CREATE INDEX "historial_reserva_reserva_id_created_at_idx" ON "historial_reserva"("reserva_id", "created_at");

-- CreateIndex
CREATE INDEX "historial_reserva_usuario_id_created_at_idx" ON "historial_reserva"("usuario_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_reserva_id_key" ON "pedido"("reserva_id");

-- CreateIndex
CREATE INDEX "pedido_sucursal_id_estado_created_at_idx" ON "pedido"("sucursal_id", "estado", "created_at");

-- CreateIndex
CREATE INDEX "pedido_cliente_id_created_at_idx" ON "pedido"("cliente_id", "created_at");

-- CreateIndex
CREATE INDEX "pedido_vendedor_id_created_at_idx" ON "pedido"("vendedor_id", "created_at");

-- CreateIndex
CREATE INDEX "pedido_mozo_id_estado_idx" ON "pedido"("mozo_id", "estado");

-- CreateIndex
CREATE INDEX "pedido_zona_id_estado_idx" ON "pedido"("zona_id", "estado");

-- CreateIndex
CREATE INDEX "pedido_reserva_id_idx" ON "pedido"("reserva_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_sucursal_id_codigo_key" ON "pedido"("sucursal_id", "codigo");

-- CreateIndex
CREATE INDEX "detalle_pedido_pedido_id_estado_idx" ON "detalle_pedido"("pedido_id", "estado");

-- CreateIndex
CREATE INDEX "detalle_pedido_producto_sucursal_id_idx" ON "detalle_pedido"("producto_sucursal_id");

-- CreateIndex
CREATE INDEX "comanda_pedido_id_idx" ON "comanda"("pedido_id");

-- CreateIndex
CREATE INDEX "comanda_sucursal_id_destino_estado_created_at_idx" ON "comanda"("sucursal_id", "destino", "estado", "created_at");

-- CreateIndex
CREATE INDEX "comanda_procesado_por_id_estado_idx" ON "comanda"("procesado_por_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "comanda_sucursal_id_codigo_key" ON "comanda"("sucursal_id", "codigo");

-- CreateIndex
CREATE INDEX "detalle_comanda_detalle_pedido_id_idx" ON "detalle_comanda"("detalle_pedido_id");

-- CreateIndex
CREATE INDEX "detalle_comanda_comanda_id_estado_idx" ON "detalle_comanda"("comanda_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "detalle_comanda_comanda_id_detalle_pedido_id_key" ON "detalle_comanda"("comanda_id", "detalle_pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "entrega_pedido_codigo_validacion_key" ON "entrega_pedido"("codigo_validacion");

-- CreateIndex
CREATE INDEX "entrega_pedido_pedido_id_estado_idx" ON "entrega_pedido"("pedido_id", "estado");

-- CreateIndex
CREATE INDEX "entrega_pedido_mozo_id_created_at_idx" ON "entrega_pedido"("mozo_id", "created_at");

-- CreateIndex
CREATE INDEX "entrega_pedido_estado_created_at_idx" ON "entrega_pedido"("estado", "created_at");

-- CreateIndex
CREATE INDEX "detalle_entrega_detalle_pedido_id_idx" ON "detalle_entrega"("detalle_pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "detalle_entrega_entrega_pedido_id_detalle_pedido_id_key" ON "detalle_entrega"("entrega_pedido_id", "detalle_pedido_id");

-- CreateIndex
CREATE INDEX "caja_sucursal_id_estado_fecha_apertura_idx" ON "caja"("sucursal_id", "estado", "fecha_apertura");

-- CreateIndex
CREATE INDEX "caja_vendedor_id_estado_idx" ON "caja"("vendedor_id", "estado");

-- CreateIndex
CREATE INDEX "caja_abierta_por_id_idx" ON "caja"("abierta_por_id");

-- CreateIndex
CREATE INDEX "caja_cerrada_por_id_idx" ON "caja"("cerrada_por_id");

-- CreateIndex
CREATE UNIQUE INDEX "caja_sucursal_id_codigo_key" ON "caja"("sucursal_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "venta_pedido_id_key" ON "venta"("pedido_id");

-- CreateIndex
CREATE INDEX "venta_sucursal_id_created_at_idx" ON "venta"("sucursal_id", "created_at");

-- CreateIndex
CREATE INDEX "venta_vendedor_id_created_at_idx" ON "venta"("vendedor_id", "created_at");

-- CreateIndex
CREATE INDEX "venta_cliente_id_created_at_idx" ON "venta"("cliente_id", "created_at");

-- CreateIndex
CREATE INDEX "venta_caja_id_estado_idx" ON "venta"("caja_id", "estado");

-- CreateIndex
CREATE INDEX "venta_estado_created_at_idx" ON "venta"("estado", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "venta_sucursal_id_numero_ticket_key" ON "venta"("sucursal_id", "numero_ticket");

-- CreateIndex
CREATE INDEX "detalle_venta_venta_id_idx" ON "detalle_venta"("venta_id");

-- CreateIndex
CREATE INDEX "detalle_venta_producto_sucursal_id_idx" ON "detalle_venta"("producto_sucursal_id");

-- CreateIndex
CREATE INDEX "pago_venta_venta_id_estado_idx" ON "pago_venta"("venta_id", "estado");

-- CreateIndex
CREATE INDEX "pago_venta_metodo_pago_created_at_idx" ON "pago_venta"("metodo_pago", "created_at");

-- CreateIndex
CREATE INDEX "pago_venta_numero_operacion_idx" ON "pago_venta"("numero_operacion");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_gasto_nombre_key" ON "categoria_gasto"("nombre");

-- CreateIndex
CREATE INDEX "categoria_gasto_activo_idx" ON "categoria_gasto"("activo");

-- CreateIndex
CREATE INDEX "gasto_sucursal_id_fecha_gasto_idx" ON "gasto"("sucursal_id", "fecha_gasto");

-- CreateIndex
CREATE INDEX "gasto_categoria_gasto_id_fecha_gasto_idx" ON "gasto"("categoria_gasto_id", "fecha_gasto");

-- CreateIndex
CREATE INDEX "gasto_administrador_id_idx" ON "gasto"("administrador_id");

-- CreateIndex
CREATE INDEX "gasto_caja_id_idx" ON "gasto"("caja_id");

-- CreateIndex
CREATE INDEX "gasto_estado_fecha_gasto_idx" ON "gasto"("estado", "fecha_gasto");

-- CreateIndex
CREATE INDEX "programa_fidelizacion_sucursal_id_activo_fecha_inicio_fecha_idx" ON "programa_fidelizacion"("sucursal_id", "activo", "fecha_inicio", "fecha_fin");

-- CreateIndex
CREATE INDEX "programa_fidelizacion_tipo_activo_idx" ON "programa_fidelizacion"("tipo", "activo");

-- CreateIndex
CREATE INDEX "programa_fidelizacion_creado_por_id_idx" ON "programa_fidelizacion"("creado_por_id");

-- CreateIndex
CREATE INDEX "progreso_fidelizacion_programa_id_idx" ON "progreso_fidelizacion"("programa_id");

-- CreateIndex
CREATE INDEX "progreso_fidelizacion_cliente_id_updated_at_idx" ON "progreso_fidelizacion"("cliente_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "progreso_fidelizacion_cliente_id_programa_id_key" ON "progreso_fidelizacion"("cliente_id", "programa_id");

-- CreateIndex
CREATE INDEX "premio_cliente_cliente_id_estado_fecha_vencimiento_idx" ON "premio_cliente"("cliente_id", "estado", "fecha_vencimiento");

-- CreateIndex
CREATE INDEX "premio_cliente_programa_id_idx" ON "premio_cliente"("programa_id");

-- CreateIndex
CREATE INDEX "premio_cliente_venta_canje_id_idx" ON "premio_cliente"("venta_canje_id");

-- CreateIndex
CREATE INDEX "premio_cliente_producto_premio_id_idx" ON "premio_cliente"("producto_premio_id");

-- CreateIndex
CREATE INDEX "promocion_sucursal_id_estado_fecha_inicio_fecha_fin_idx" ON "promocion"("sucursal_id", "estado", "fecha_inicio", "fecha_fin");

-- CreateIndex
CREATE INDEX "promocion_creado_por_id_idx" ON "promocion"("creado_por_id");

-- CreateIndex
CREATE INDEX "promocion_producto_producto_id_idx" ON "promocion_producto"("producto_id");

-- CreateIndex
CREATE INDEX "venta_promocion_promocion_id_idx" ON "venta_promocion"("promocion_id");

-- CreateIndex
CREATE UNIQUE INDEX "venta_promocion_venta_id_promocion_id_key" ON "venta_promocion"("venta_id", "promocion_id");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_sistema_clave_unica_key" ON "configuracion_sistema"("clave_unica");

-- CreateIndex
CREATE INDEX "configuracion_sistema_sucursal_id_clave_idx" ON "configuracion_sistema"("sucursal_id", "clave");

-- CreateIndex
CREATE INDEX "configuracion_sistema_actualizado_por_id_idx" ON "configuracion_sistema"("actualizado_por_id");

-- CreateIndex
CREATE INDEX "notificacion_usuario_id_leida_created_at_idx" ON "notificacion"("usuario_id", "leida", "created_at");

-- CreateIndex
CREATE INDEX "notificacion_rol_id_leida_created_at_idx" ON "notificacion"("rol_id", "leida", "created_at");

-- CreateIndex
CREATE INDEX "notificacion_sucursal_id_tipo_created_at_idx" ON "notificacion"("sucursal_id", "tipo", "created_at");

-- CreateIndex
CREATE INDEX "notificacion_entidad_entidad_id_idx" ON "notificacion"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_created_at_idx" ON "auditoria"("usuario_id", "created_at");

-- CreateIndex
CREATE INDEX "auditoria_sucursal_id_created_at_idx" ON "auditoria"("sucursal_id", "created_at");

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidad_id_idx" ON "auditoria"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "auditoria_modulo_accion_created_at_idx" ON "auditoria"("modulo", "accion", "created_at");

-- CreateIndex
CREATE INDEX "correlativo_sucursal_id_idx" ON "correlativo"("sucursal_id");

-- CreateIndex
CREATE UNIQUE INDEX "correlativo_sucursal_id_tipo_documento_key" ON "correlativo"("sucursal_id", "tipo_documento");

-- CreateIndex
CREATE INDEX "respaldo_estado_created_at_idx" ON "respaldo"("estado", "created_at");

-- CreateIndex
CREATE INDEX "respaldo_tipo_created_at_idx" ON "respaldo"("tipo", "created_at");

-- CreateIndex
CREATE INDEX "respaldo_solicitado_por_id_idx" ON "respaldo"("solicitado_por_id");

-- AddForeignKey
ALTER TABLE "zona" ADD CONSTRAINT "zona_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario_atencion" ADD CONSTRAINT "horario_atencion_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueo_disponibilidad" ADD CONSTRAINT "bloqueo_disponibilidad_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueo_disponibilidad" ADD CONSTRAINT "bloqueo_disponibilidad_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueo_disponibilidad" ADD CONSTRAINT "bloqueo_disponibilidad_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permiso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_sucursal" ADD CONSTRAINT "usuario_sucursal_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_sucursal" ADD CONSTRAINT "usuario_sucursal_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_unidad_medida_id_fkey" FOREIGN KEY ("unidad_medida_id") REFERENCES "unidad_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_sucursal" ADD CONSTRAINT "producto_sucursal_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_sucursal" ADD CONSTRAINT "producto_sucursal_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_permanente" ADD CONSTRAINT "stock_permanente_producto_sucursal_id_fkey" FOREIGN KEY ("producto_sucursal_id") REFERENCES "producto_sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_diario" ADD CONSTRAINT "stock_diario_producto_sucursal_id_fkey" FOREIGN KEY ("producto_sucursal_id") REFERENCES "producto_sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_diario" ADD CONSTRAINT "stock_diario_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_producto_sucursal_id_fkey" FOREIGN KEY ("producto_sucursal_id") REFERENCES "producto_sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_aprobado_por_id_fkey" FOREIGN KEY ("aprobado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_cancelado_por_id_fkey" FOREIGN KEY ("cancelado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_reserva" ADD CONSTRAINT "detalle_reserva_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_reserva" ADD CONSTRAINT "detalle_reserva_producto_sucursal_id_fkey" FOREIGN KEY ("producto_sucursal_id") REFERENCES "producto_sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_reserva" ADD CONSTRAINT "pago_reserva_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_reserva" ADD CONSTRAINT "pago_reserva_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_reserva" ADD CONSTRAINT "pago_reserva_confirmado_por_id_fkey" FOREIGN KEY ("confirmado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_reserva" ADD CONSTRAINT "historial_reserva_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_reserva" ADD CONSTRAINT "historial_reserva_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_mozo_id_fkey" FOREIGN KEY ("mozo_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_cancelado_por_id_fkey" FOREIGN KEY ("cancelado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_pedido" ADD CONSTRAINT "detalle_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_pedido" ADD CONSTRAINT "detalle_pedido_producto_sucursal_id_fkey" FOREIGN KEY ("producto_sucursal_id") REFERENCES "producto_sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda" ADD CONSTRAINT "comanda_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda" ADD CONSTRAINT "comanda_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda" ADD CONSTRAINT "comanda_procesado_por_id_fkey" FOREIGN KEY ("procesado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_comanda" ADD CONSTRAINT "detalle_comanda_comanda_id_fkey" FOREIGN KEY ("comanda_id") REFERENCES "comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_comanda" ADD CONSTRAINT "detalle_comanda_detalle_pedido_id_fkey" FOREIGN KEY ("detalle_pedido_id") REFERENCES "detalle_pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega_pedido" ADD CONSTRAINT "entrega_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega_pedido" ADD CONSTRAINT "entrega_pedido_mozo_id_fkey" FOREIGN KEY ("mozo_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_entrega" ADD CONSTRAINT "detalle_entrega_entrega_pedido_id_fkey" FOREIGN KEY ("entrega_pedido_id") REFERENCES "entrega_pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_entrega" ADD CONSTRAINT "detalle_entrega_detalle_pedido_id_fkey" FOREIGN KEY ("detalle_pedido_id") REFERENCES "detalle_pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja" ADD CONSTRAINT "caja_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja" ADD CONSTRAINT "caja_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja" ADD CONSTRAINT "caja_abierta_por_id_fkey" FOREIGN KEY ("abierta_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja" ADD CONSTRAINT "caja_cerrada_por_id_fkey" FOREIGN KEY ("cerrada_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_anulada_por_id_fkey" FOREIGN KEY ("anulada_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_venta" ADD CONSTRAINT "detalle_venta_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_venta" ADD CONSTRAINT "detalle_venta_producto_sucursal_id_fkey" FOREIGN KEY ("producto_sucursal_id") REFERENCES "producto_sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_venta" ADD CONSTRAINT "pago_venta_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_categoria_gasto_id_fkey" FOREIGN KEY ("categoria_gasto_id") REFERENCES "categoria_gasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_administrador_id_fkey" FOREIGN KEY ("administrador_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_fidelizacion" ADD CONSTRAINT "programa_fidelizacion_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_fidelizacion" ADD CONSTRAINT "programa_fidelizacion_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_fidelizacion" ADD CONSTRAINT "programa_fidelizacion_producto_premio_id_fkey" FOREIGN KEY ("producto_premio_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progreso_fidelizacion" ADD CONSTRAINT "progreso_fidelizacion_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progreso_fidelizacion" ADD CONSTRAINT "progreso_fidelizacion_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programa_fidelizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premio_cliente" ADD CONSTRAINT "premio_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premio_cliente" ADD CONSTRAINT "premio_cliente_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programa_fidelizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premio_cliente" ADD CONSTRAINT "premio_cliente_producto_premio_id_fkey" FOREIGN KEY ("producto_premio_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premio_cliente" ADD CONSTRAINT "premio_cliente_venta_canje_id_fkey" FOREIGN KEY ("venta_canje_id") REFERENCES "venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premio_cliente" ADD CONSTRAINT "premio_cliente_canjeado_por_id_fkey" FOREIGN KEY ("canjeado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promocion" ADD CONSTRAINT "promocion_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promocion" ADD CONSTRAINT "promocion_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promocion_producto" ADD CONSTRAINT "promocion_producto_promocion_id_fkey" FOREIGN KEY ("promocion_id") REFERENCES "promocion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promocion_producto" ADD CONSTRAINT "promocion_producto_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_promocion" ADD CONSTRAINT "venta_promocion_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_promocion" ADD CONSTRAINT "venta_promocion_promocion_id_fkey" FOREIGN KEY ("promocion_id") REFERENCES "promocion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_sistema" ADD CONSTRAINT "configuracion_sistema_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_sistema" ADD CONSTRAINT "configuracion_sistema_actualizado_por_id_fkey" FOREIGN KEY ("actualizado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correlativo" ADD CONSTRAINT "correlativo_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respaldo" ADD CONSTRAINT "respaldo_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respaldo" ADD CONSTRAINT "respaldo_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
