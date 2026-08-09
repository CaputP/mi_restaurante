CREATE TYPE "EstadoResena" AS ENUM (
  'PENDIENTE',
  'APROBADA',
  'RECHAZADA',
  'OCULTA'
);

ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'RESERVA_ACTUALIZADA';
ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'COMANDA_NUEVA';
ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'CAJA_CERRADA';
ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'RESENA_DISPONIBLE';
ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'RESENA_PENDIENTE';
ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'RESENA_MODERADA';

CREATE TABLE "resena" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "venta_id" UUID NOT NULL,
  "cliente_id" UUID NOT NULL,
  "sucursal_id" UUID NOT NULL,
  "calificacion" INTEGER NOT NULL,
  "comentario" TEXT NOT NULL,
  "nombre_publico" VARCHAR(100) NOT NULL,
  "consentimiento_publicacion_at" TIMESTAMPTZ(3) NOT NULL,
  "estado" "EstadoResena" NOT NULL DEFAULT 'PENDIENTE',
  "destacada" BOOLEAN NOT NULL DEFAULT false,
  "moderada_por_id" UUID,
  "moderada_at" TIMESTAMPTZ(3),
  "motivo_moderacion" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "resena_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "resena_calificacion_check" CHECK ("calificacion" BETWEEN 1 AND 5),
  CONSTRAINT "resena_comentario_length_check" CHECK (char_length(btrim("comentario")) BETWEEN 10 AND 1000),
  CONSTRAINT "resena_estado_moderacion_check" CHECK (
    ("estado" = 'PENDIENTE' AND "moderada_por_id" IS NULL AND "moderada_at" IS NULL)
    OR
    ("estado" <> 'PENDIENTE' AND "moderada_por_id" IS NOT NULL AND "moderada_at" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "resena_venta_id_key" ON "resena"("venta_id");
CREATE INDEX "resena_estado_destacada_created_at_idx" ON "resena"("estado", "destacada", "created_at");
CREATE INDEX "resena_sucursal_id_estado_created_at_idx" ON "resena"("sucursal_id", "estado", "created_at");
CREATE INDEX "resena_cliente_id_created_at_idx" ON "resena"("cliente_id", "created_at");

ALTER TABLE "resena"
  ADD CONSTRAINT "resena_venta_id_fkey"
  FOREIGN KEY ("venta_id") REFERENCES "venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resena"
  ADD CONSTRAINT "resena_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resena"
  ADD CONSTRAINT "resena_sucursal_id_fkey"
  FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resena"
  ADD CONSTRAINT "resena_moderada_por_id_fkey"
  FOREIGN KEY ("moderada_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permiso" (
  "id", "codigo", "nombre", "descripcion", "modulo", "activo", "created_at", "updated_at"
)
VALUES (
  gen_random_uuid(),
  'RESENA_GESTIONAR',
  'Gestionar reseñas verificadas',
  'Modera y destaca opiniones asociadas a ventas confirmadas.',
  'RESEÑAS',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("codigo") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "modulo" = EXCLUDED."modulo",
  "activo" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id", "created_at")
SELECT rol.id, permiso.id, CURRENT_TIMESTAMP
FROM "rol" AS rol
CROSS JOIN "permiso" AS permiso
WHERE rol.codigo IN ('ADMINISTRADOR_GENERAL', 'ADMINISTRADOR_SUCURSAL')
  AND permiso.codigo = 'RESENA_GESTIONAR'
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;

CREATE OR REPLACE FUNCTION notify_vallecito_notification_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.usuario_id;
  ELSE
    target_user_id := NEW.usuario_id;
  END IF;

  IF target_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  PERFORM pg_notify(
    'vallecito_realtime_events',
    json_build_object(
      'id', concat(
        floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint,
        '-notification-',
        txid_current(),
        '-',
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
      ),
      'type', 'DATA_CHANGED',
      'resources', json_build_array('NOTIFICATIONS'),
      'userIds', json_build_array(target_user_id::text),
      'createdAt', to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )::text
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "notificacion_realtime_change" ON "notificacion";
CREATE TRIGGER "notificacion_realtime_change"
AFTER INSERT OR UPDATE OR DELETE ON "notificacion"
FOR EACH ROW EXECUTE FUNCTION notify_vallecito_notification_change();
