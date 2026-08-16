# El Vallecito de Chocco

Sistema web para la operación de restaurante: autenticación, sucursales, catálogo, inventario, reservas, pedidos, comandas, entregas, caja, ventas, gastos, promociones, fidelización, reportes y auditoría.

## Arquitectura

- `frontend/`: React 19 + Vite. Las rutas se cargan bajo demanda para mantener pequeño el paquete inicial.
- `backend/`: Express 5 + TypeScript + Prisma 7.
- `PostgreSQL`: fuente de verdad transaccional.
- `.github/workflows/quality.yml`: compilación, pruebas, lint, validación Prisma y auditoría de dependencias.
- `docker-compose.yml`: entorno reproducible con base de datos, migraciones, API y Nginx.
- `docs/ADMIN_DESIGN_SYSTEM.md`: patrón visual, componentes y reglas para extender las áreas administrativa y operativa.
- `docs/REFACTORING_REPORT.md`: inventario completo de seguridad, refactorización, UI/UX y preparación para producción.
- `docs/REQUIREMENTS_TRACEABILITY.md`: ruta entre los requisitos originales y los módulos implementados.
- `docs/BACKUP_AND_RECOVERY.md`: procedimiento verificable de respaldo, restauración y recuperación.
- `docs/DEPLOYMENT_FREE_DEMO.md`: publicación gratuita temporal en Vercel, Render, Supabase y Brevo.
- `docs/PROTECCION_DATOS_ANPD.md`: inventario legal-técnico y pendientes externos de protección de datos.

La API está organizada por módulos de negocio. Las operaciones de dinero críticas utilizan transacciones serializables, bloqueos de fila y bloqueo asesor por número de operación para impedir pagos duplicados o sobrepagos concurrentes.

## Requisitos

- Node.js 24 y npm.
- PostgreSQL 16 o superior, o Docker con Compose.
- Credenciales OAuth Web de Google.

## Desarrollo local

1. Copiar las variables de entorno:

   ```powershell
   Copy-Item backend/.env.example backend/.env
   Copy-Item frontend/.env.example frontend/.env
   ```

2. Completar `DATABASE_URL`, `JWT_SECRET` y `GOOGLE_CLIENT_ID`.
3. Instalar y preparar el backend:

   ```powershell
   Set-Location backend
   npm ci
   npx prisma generate
   npm run prisma:migrate:deploy
   npm run prisma:seed
   npm run dev
   ```

4. En otra terminal, iniciar el frontend:

   ```powershell
   Set-Location frontend
   npm ci
   npm run dev
   ```

La interfaz queda en `http://localhost:5173` y la API versionada en `http://localhost:3000/api/v1`. Las rutas heredadas bajo `/api` se mantienen temporalmente por compatibilidad.

## Contenedores

Copiar `.env.example` a `.env`, reemplazar todos los valores `replace-with-*` y ejecutar:

```powershell
docker compose up --build
```

El frontend se publica en `http://localhost:8080`, Nginx proxifica `/api` hacia el backend y PostgreSQL permanece en una red interna. El servicio `migrate` aplica las migraciones antes de habilitar la API. La API no publica directamente el puerto `3000`: las solicitudes externas ingresan exclusivamente por Nginx.

## Controles de calidad

```powershell
Set-Location backend
npm run check
npm audit --audit-level=high
npm run prisma:validate
npm run production:preflight

Set-Location ../frontend
npm run check
npm audit --audit-level=high
```

`/api/v1/health` comprueba el proceso HTTP. `/api/v1/ready` comprueba también la conexión con PostgreSQL y debe usarse como readiness probe.

## Variables y secretos

- Nunca confirmar archivos `.env` ni credenciales reales.
- En Docker, `DATABASE_URL` debe usar el host `database` y las mismas credenciales de PostgreSQL. Los caracteres reservados de la contraseña deben codificarse para URL.
- En producción, `JWT_SECRET` exige al menos 48 caracteres aleatorios.
- La sesión se entrega mediante una cookie `HttpOnly`. En producción configure `AUTH_COOKIE_SECURE=true`.
- Use `AUTH_COOKIE_SAME_SITE=lax` o `strict` cuando frontend y API compartan sitio. Use `none` solo con HTTPS cuando estén en sitios distintos; preferiblemente publique ambos bajo el mismo dominio raíz para evitar bloqueos de cookies de terceros.
- `FRONTEND_URL` debe ser el origen HTTPS exacto permitido por CORS, sin ruta final.
- `VITE_API_URL` se fija al compilar el frontend; no cambia en tiempo de ejecución.
- `EMAIL_MODE=smtp` es obligatorio en producción, junto con las variables SMTP.
- `BACKUP_ENABLED=true` es obligatorio en producción. Configure directorio, intervalo y retención, y almacene una segunda copia cifrada fuera del servidor.
- `TRUST_PROXY_HOPS` debe coincidir exactamente con el número de proxies confiables delante de Express. Un valor incorrecto rompe la identificación de IP y el rate limit.

## Despliegue seguro

Antes de promover una versión:

1. Ejecutar los controles de calidad y revisar que la auditoría reporte cero vulnerabilidades altas.
2. Crear un respaldo verificable de PostgreSQL.
3. Ejecutar `npm run production:preflight` contra un clon restaurado del backup y corregir cualquier inconsistencia.
4. Aplicar `npm run prisma:migrate:deploy` como una tarea única, nunca desde varias réplicas simultáneas.
5. Desplegar la API y esperar una respuesta `200` de `/api/ready`.
6. Desplegar el frontend con `VITE_API_URL` y el cliente Google del entorno correcto.
7. Verificar login, autorización por roles, apertura de caja, pago, anulación y reserva en un entorno de ensayo.

Para más de una réplica de API, el limitador en memoria debe sustituirse por un almacén compartido (por ejemplo Redis) o trasladarse al gateway/WAF. Los logs son JSON y ocultan tokens, cookies, contraseñas y secretos; deben enviarse a un agregador con retención y alertas.

Los respaldos deben almacenarse cifrados fuera del servidor, probar su restauración periódicamente y conservar una política definida de retención. El rollback de código puede reutilizar la imagen anterior; una migración destructiva requiere un procedimiento de base de datos específico y probado previamente.

## Estado de preparación

El repositorio incluye una base sólida para producción: validación estricta de configuración, CORS restrictivo, Helmet, límites de cuerpo y solicitudes, logging estructurado, apagado ordenado, readiness, contenedores sin usuario root para la API, migraciones separadas, carga diferida del frontend y CI.

Todavía deben decidirse para el entorno real: proveedor de hosting, dominios, TLS, SMTP, almacenamiento de respaldos, monitoreo/alertas y si habrá múltiples réplicas. Esas decisiones son infraestructura y no deben quedar codificadas con valores ficticios.

La configuración legal, las políticas, la evidencia de aceptación y el procedimiento del Libro de Reclamaciones se documentan en `docs/CUMPLIMIENTO_LEGAL.md`. La alternativa gratuita de demostración se describe en `docs/DEPLOYMENT_FREE_DEMO.md`; no debe usarse con operaciones reales.
