-- Mantiene las asignaciones esenciales al actualizar una base ya existente.
-- El seed configura instalaciones nuevas, mientras esta migración protege
-- entornos donde los datos iniciales no deben volver a ejecutarse.
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
WHERE rol.codigo = 'VENDEDOR'
  AND permiso.codigo = 'CAJA_CERRAR'
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
