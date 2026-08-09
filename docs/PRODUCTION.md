# Operación en producción

## Topología recomendada

Use tres unidades independientes: frontend estático detrás de CDN/TLS, API privada detrás de proxy o balanceador y PostgreSQL administrado con backups automáticos. Solo el frontend y la API deben ser públicos; PostgreSQL no debe aceptar tráfico desde Internet.

## Secuencia de entrega

1. Construir imágenes inmutables identificadas con el SHA del commit.
2. Ejecutar pruebas y auditoría de dependencias en CI.
3. Respaldar y ejecutar las migraciones como un job único.
4. Desplegar primero la API y validar `/api/v1/ready`.
5. Construir/desplegar el frontend con las URLs definitivas.
6. Ejecutar smoke tests con una cuenta sin privilegios y otra administrativa.

No ejecute `prisma migrate dev` en producción. No ejecute el seed automáticamente sobre una base con datos reales.

## TLS, proxy y red

- Termine TLS 1.2 o superior en el proveedor o proxy.
- Fuerce redirección HTTP a HTTPS y habilite HSTS en el punto que termina TLS.
- Configure `TRUST_PROXY_HOPS` solo después de confirmar la cantidad real de saltos.
- Restrinja CORS al origen exacto configurado en `FRONTEND_URL`.
- Mantenga frontend y API bajo el mismo dominio raíz siempre que sea posible. La autenticación usa cookies `HttpOnly`, `Secure` y protección CSRF; despliegues realmente cross-site requieren `AUTH_COOKIE_SAME_SITE=none` y pueden verse afectados por políticas de cookies de terceros del navegador.
- Aplique un límite de tamaño y tiempo también en el proxy.

## Base de datos

- Use un usuario de aplicación sin permisos de superusuario.
- Separe, cuando el proveedor lo permita, el usuario que migra del usuario de ejecución.
- Habilite cifrado en tránsito y en reposo.
- Mantenga backups diarios y recuperación a un punto en el tiempo.
- Ensaye una restauración al menos trimestralmente y registre duración y resultado.
- Valide siempre el SHA-256 registrado antes de restaurar. La herramienta incluida permanece bloqueada salvo habilitación expresa durante una ventana de mantenimiento.

El procedimiento completo se encuentra en `BACKUP_AND_RECOVERY.md`.

## Observabilidad

Recolecte stdout/stderr JSON de la API y alerte al menos por:

- tasa de respuestas 5xx;
- latencia p95/p99;
- fallos de `/api/v1/ready`;
- reinicios del proceso;
- conexiones y espacio de PostgreSQL;
- errores de migración;
- picos de 401, 403 y 429.

Propague `X-Request-Id` desde el proxy para correlacionar una solicitud entre componentes. Nunca registre cuerpos completos de login, cabeceras de autorización ni cadenas de conexión.

## Incidentes y rollback

Ante un incidente, preserve logs y evidencia, limite el acceso afectado, rote secretos expuestos y restaure el último artefacto conocido. No revierta una migración a ciegas: use una migración correctiva o restaure el backup solo tras evaluar pérdida de datos. Documente causa raíz, impacto y acciones preventivas.
