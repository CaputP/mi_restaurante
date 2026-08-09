# Respaldo y recuperación

## Objetivo operativo

La aplicación crea respaldos PostgreSQL en formato custom mediante `pg_dump`, calcula SHA-256 y registra el resultado en la tabla `respaldo`. Como objetivo inicial, configure un RPO de 24 horas y mida el RTO durante un ensayo real; estos valores deben ajustarse al volumen y al proveedor elegido.

El volumen local no es una estrategia completa. Replice cada respaldo completado hacia almacenamiento cifrado, privado, versionado y ubicado fuera del servidor de la API.

## Configuración

- `BACKUP_ENABLED=true` activa el programador y es obligatorio con `NODE_ENV=production`.
- `BACKUP_DIRECTORY` define el único directorio permitido.
- `BACKUP_INTERVAL_HOURS` controla la frecuencia, entre 1 y 168 horas.
- `BACKUP_RETENTION_DAYS` controla la eliminación local y conserva el registro histórico.
- `PG_DUMP_PATH` permite indicar la ubicación de `pg_dump`.
- `PG_RESTORE_PATH` puede indicar la ubicación de `pg_restore` durante una recuperación.

Compruebe binarios, conexión, generación, lectura y checksum sin conservar datos mediante `npm run backup:verify`. En Windows puede definir temporalmente las rutas completas de `PG_DUMP_PATH` y `PG_RESTORE_PATH` si PostgreSQL no está incluido en `PATH`.

El contenedor de la API incluye el cliente de PostgreSQL y monta `/app/backups` en un volumen dedicado. Solo el administrador general con `RESPALDO_GESTIONAR` puede consultar o solicitar respaldos manuales, y debe reautenticarse.

## Verificación periódica

1. Confirme que el último registro esté `COMPLETADO`, tenga tamaño mayor a cero y checksum.
2. Copie el archivo y su checksum a almacenamiento externo cifrado.
3. Una vez al mes ejecute `pg_restore --list` sobre una copia.
4. Al menos trimestralmente restaure en una base aislada, ejecute migraciones, preflight y smoke tests.
5. Registre fecha, responsable, duración, resultado y acciones correctivas.

## Restauración protegida

La restauración es destructiva para la base de destino y no está disponible como endpoint web.

1. Declare una ventana de mantenimiento y detenga todas las instancias de la API.
2. Seleccione un archivo dentro de `BACKUP_DIRECTORY` y obtenga su checksum desde el panel o la base.
3. Apunte `DATABASE_URL` exclusivamente a la base de destino verificada.
4. Habilite temporalmente `ALLOW_DATABASE_RESTORE=true`.
5. Ejecute desde `backend/`:

   ```powershell
   npm run database:restore -- --file C:\ruta-autorizada\respaldo.dump --confirm nombre_base --sha256 checksum_de_64_caracteres
   ```

La herramienta comprueba ubicación, confirmación del nombre, checksum SHA-256 y estructura del dump antes de ejecutar `pg_restore --clean --if-exists --exit-on-error`. La contraseña de PostgreSQL se transmite al subproceso mediante su entorno, no mediante argumentos visibles.

## Comprobaciones posteriores

```powershell
npm run prisma:migrate:deploy
npm run production:preflight
npm run test
npm run build
```

Después valide `/api/v1/ready`, inicio de sesión, consulta de reservas, caja, venta, ticket y reporte. Quite `ALLOW_DATABASE_RESTORE` antes de reabrir el servicio. Si cualquier control falla, mantenga el sistema fuera de línea y conserve logs y archivos para análisis.
