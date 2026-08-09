CREATE TYPE "TipoReclamoConsumidor" AS ENUM ('RECLAMO', 'QUEJA');
CREATE TYPE "TipoBienReclamado" AS ENUM ('PRODUCTO', 'SERVICIO');
CREATE TYPE "EstadoReclamoConsumidor" AS ENUM ('RECIBIDO', 'EN_REVISION', 'RESPONDIDO', 'CERRADO');
CREATE TYPE "CanalRespuestaConsumidor" AS ENUM ('CORREO', 'TELEFONO', 'DOMICILIO');
CREATE TYPE "TipoDocumentoConsumidor" AS ENUM ('DNI', 'CE', 'PASAPORTE', 'RUC', 'OTRO');

ALTER TABLE "usuario"
  ADD COLUMN "terminos_aceptados_at" TIMESTAMPTZ(3),
  ADD COLUMN "terminos_version" VARCHAR(30),
  ADD COLUMN "privacidad_aceptada_at" TIMESTAMPTZ(3),
  ADD COLUMN "privacidad_version" VARCHAR(30);

ALTER TABLE "reserva"
  ADD COLUMN "politica_reserva_aceptada_at" TIMESTAMPTZ(3),
  ADD COLUMN "politica_reserva_version" VARCHAR(30);

CREATE TABLE "reclamo_consumidor" (
  "id" UUID NOT NULL,
  "codigo" VARCHAR(30) NOT NULL,
  "token_consulta_hash" VARCHAR(64) NOT NULL,
  "sucursal_id" UUID,
  "tipo_documento" "TipoDocumentoConsumidor" NOT NULL,
  "numero_documento" VARCHAR(20) NOT NULL,
  "nombre_completo" VARCHAR(200) NOT NULL,
  "domicilio" VARCHAR(300) NOT NULL,
  "telefono" VARCHAR(30),
  "correo" VARCHAR(160) NOT NULL,
  "es_menor_edad" BOOLEAN NOT NULL DEFAULT false,
  "nombre_apoderado" VARCHAR(200),
  "tipo" "TipoReclamoConsumidor" NOT NULL,
  "bien_contratado" "TipoBienReclamado" NOT NULL,
  "descripcion_bien" VARCHAR(300) NOT NULL,
  "monto_reclamado" DECIMAL(12,2),
  "detalle" TEXT NOT NULL,
  "pedido_consumidor" TEXT NOT NULL,
  "canal_respuesta" "CanalRespuestaConsumidor" NOT NULL,
  "estado" "EstadoReclamoConsumidor" NOT NULL DEFAULT 'RECIBIDO',
  "respuesta" TEXT,
  "medidas_adoptadas" TEXT,
  "respondido_at" TIMESTAMPTZ(3),
  "respondido_por_id" UUID,
  "privacidad_version" VARCHAR(30) NOT NULL,
  "privacidad_aceptada_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "reclamo_consumidor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reclamo_consumidor_codigo_key" ON "reclamo_consumidor"("codigo");
CREATE INDEX "reclamo_consumidor_estado_created_at_idx" ON "reclamo_consumidor"("estado", "created_at");
CREATE INDEX "reclamo_consumidor_sucursal_id_estado_created_at_idx" ON "reclamo_consumidor"("sucursal_id", "estado", "created_at");
CREATE INDEX "reclamo_consumidor_numero_documento_created_at_idx" ON "reclamo_consumidor"("numero_documento", "created_at");

ALTER TABLE "reclamo_consumidor"
  ADD CONSTRAINT "reclamo_consumidor_sucursal_id_fkey"
  FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reclamo_consumidor"
  ADD CONSTRAINT "reclamo_consumidor_respondido_por_id_fkey"
  FOREIGN KEY ("respondido_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permiso" (
  "id",
  "codigo",
  "nombre",
  "descripcion",
  "modulo",
  "activo",
  "created_at",
  "updated_at"
)
VALUES (
  gen_random_uuid(),
  'RECLAMO_GESTIONAR',
  'Gestionar el Libro de Reclamaciones',
  'Consulta y responde quejas y reclamos de consumidores.',
  'RECLAMOS',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("codigo") DO UPDATE
SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "modulo" = EXCLUDED."modulo",
  "activo" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "rol_permiso" (
  "rol_id",
  "permiso_id",
  "created_at"
)
SELECT
  rol.id,
  permiso.id,
  CURRENT_TIMESTAMP
FROM "rol" AS rol
CROSS JOIN "permiso" AS permiso
WHERE rol.codigo IN ('ADMINISTRADOR_GENERAL', 'ADMINISTRADOR_SUCURSAL')
  AND permiso.codigo = 'RECLAMO_GESTIONAR'
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
