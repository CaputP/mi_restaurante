# Informe de revisión, seguridad y refactorización

Este documento resume el trabajo realizado sobre el proyecto desde la revisión inicial. El objetivo fue eliminar fallos capaces de romper operaciones críticas, mejorar la seguridad, reducir duplicación, establecer una base desplegable y unificar la experiencia de administración y operación.

## 1. Seguridad de sesión y API

- La sesión dejó de guardarse en `sessionStorage`. El JWT se entrega mediante cookie `HttpOnly`, con opciones `Secure`, `SameSite`, duración y prefijo `__Host-` configurables por entorno.
- Se agregó protección CSRF de doble token. Las operaciones mutables exigen el token de la cookie en `X-CSRF-Token` y lo comparan en tiempo constante.
- Login, Google, registro, restauración de sesión y logout quedaron adaptados al modelo de cookie. El frontend envía `credentials: "include"`, limpia su estado ante un `401` y aborta la restauración si el componente se desmonta.
- CORS ahora acepta únicamente el origen configurado, con métodos y cabeceras explícitos.
- Se deshabilitó `X-Powered-By`, se agregó Helmet, límite de cuerpo JSON, parser de query simple y rate limits separados para la API y autenticación.
- La configuración se valida al iniciar mediante Zod. Producción exige secretos fuertes y coherencia entre cookies seguras, `SameSite`, SMTP, proxy y URL del frontend.
- El manejo de errores se centralizó con códigos estables y sin exponer detalles internos.
- Los logs son JSON, incluyen `requestId` y censuran contraseñas, tokens, cookies, autorizaciones y secretos.
- La auditoría de mutaciones conserva contexto de usuario, operación y solicitud sin registrar información sensible.

## 2. Integridad transaccional y concurrencia

- Se añadió una utilidad de transacciones serializables con reintentos para conflictos recuperables.
- Las operaciones críticas de ventas, caja, gastos, inventario, reservas, pedidos, comandas, entregas y anulaciones se ejecutan dentro de transacciones coherentes.
- Los flujos que compiten por disponibilidad usan bloqueos de fila o advisory locks por sucursal para evitar sobreasignar stock, zonas u horarios.
- Los números de operación electrónica se normalizan, bloquean y validan entre pagos de ventas y reservas. No se puede reutilizar una operación activa ni repetirla dentro de la misma venta.
- Se añadieron índices únicos parciales para respaldar la unicidad de operaciones de pago en PostgreSQL.
- Se añadieron constraints de base de datos para impedir pagos no positivos, efectivo inválido, montos negativos, adelantos mayores al total, cantidades inconsistentes, stock comprometido superior al disponible y gastos no positivos.
- El pago de reservas se extrajo a un servicio propio para separar cálculo, validación y persistencia del resto del ciclo de reserva.
- La disponibilidad de sucursal se reorganizó para validar colisiones y modificar el calendario bajo una única exclusión transaccional.
- Se agregó un preflight de producción que detecta datos históricos incompatibles antes de aplicar las restricciones nuevas.

## 3. Arquitectura y mantenibilidad

- `App.jsx` dejó de contener todas las rutas y ahora solo monta router, `Suspense` y un estado de carga accesible.
- La configuración de rutas se movió a `AppRoutes.jsx`; las pantallas se cargan con `lazy`, se conservan las reglas por rol y se agregó una página 404.
- Se extrajeron utilidades compartidas para errores de dominio, transacciones, auditoría, disponibilidad y operaciones de pago.
- Se separó la lógica reutilizable de cálculos de ventas/caja en `salesCash.utils.js`.
- Se creó `AdminMetricCard` para evitar copiar tarjetas de resumen entre reservas y comandas.
- Se creó `AdminDialog` para sustituir overlays artesanales por un componente probado y reutilizable.
- Se corrigieron imports CSS cuyo uso de mayúsculas no coincidía con el archivo real; esto evita compilaciones que funcionan en Windows pero fallan en Linux.

## 4. Navegación y fidelización

- “Clientes y premios” dejó de ser una opción independiente del sidebar. Ahora pertenece al módulo de Fidelización.
- `LoyaltyLayout` contiene la navegación interna entre “Programas” y “Clientes y premios”.
- Las rutas de ambas vistas están anidadas bajo `/admin/fidelizacion` y usan coincidencia exacta, por lo que solo una opción aparece activa.
- La selección ya no depende solamente del color: el enlace activo tiene estructura, fondo, borde e icono diferenciados.

## 5. Sistema de diseño y UI/UX

- Se creó `adminDesignSystem.css` como fuente central de colores semánticos, tipografía, espacios, radios, sombras, anchos y capas.
- Administración y operación cargan el mismo sistema. Los módulos compartidos mantienen el patrón sin importar si se abren en `/admin` o `/operacion`.
- Se normalizaron las estructuras de página, encabezados, subtítulos contextuales, superficies, métricas, filtros, tabs, botones, feedback, estados vacíos, badges, paginación y tablas.
- Reservas y comandas ahora presentan sus indicadores con el mismo componente y jerarquía que los demás módulos.
- Los sidebars administrativo y operativo comparten ancho, escala, colores semánticos, overlay y punto de quiebre.
- Se definieron dos variantes de tabla: densa y desplazable para comparar columnas; convertible a tarjetas para entidades operables desde móvil. Reservas usa la segunda con `data-label` por celda.
- Los breakpoints se redujeron a `1200px`, `850px` y `600px`, con cuadrículas, encabezados, navegación y paginación previsibles.
- Los mensajes de éxito y error usan regiones accesibles; los tabs informan selección; los botones de icono tienen nombre accesible; el foco visible se conserva.
- El sistema respeta `prefers-reduced-motion`.
- `AdminDialog` bloquea el scroll, mueve y atrapa el foco, cierra con Escape o backdrop y devuelve el foco al control de origen.
- `design:check` impide reintroducir colores locales, tipografía fuera de escala, tokens inexistentes, breakpoints nuevos o imports CSS con casing incorrecto.
- Las reglas para extender el patrón están documentadas en `ADMIN_DESIGN_SYSTEM.md`.

## 6. Rendimiento y recursos

- Las rutas administrativas y operativas se dividieron en chunks para evitar descargar todo el panel al entrar al sitio.
- Las imágenes públicas se convirtieron a WebP y se actualizaron todos sus imports.
- Se añadió un script de optimización de imágenes para mantener el proceso reproducible.
- Nginx sirve el frontend compilado y resuelve correctamente rutas SPA.

## 7. Preparación para producción

- Se añadieron Dockerfiles multi-stage, `.dockerignore`, `docker-compose.yml` y ejecución separada de migraciones.
- La API se ejecuta con usuario no root dentro del contenedor; PostgreSQL queda en red interna y Nginx publica el frontend.
- Se agregaron `/api/health` y `/api/ready`; readiness comprueba también PostgreSQL.
- El servidor configura timeouts, cierre ordenado, desconexión de Prisma y tratamiento de excepciones o promesas no controladas.
- Se añadieron `.env.example` de raíz, backend y frontend sin secretos reales.
- Se fijó Node 24 mediante `.nvmrc`.
- GitHub Actions instala de forma reproducible, genera Prisma, valida esquema, compila, ejecuta pruebas y audita dependencias en Linux.
- `README.md` y `PRODUCTION.md` explican desarrollo, despliegue, TLS, proxy, cookies, migraciones, backups, observabilidad, rollback y smoke tests.

## 8. Pruebas y verificaciones agregadas

- Backend: endpoints base y seguridad, sesión/CSRF y normalización/bloqueo de operaciones de pago.
- Frontend: cliente API, rutas protegidas, matriz de permisos por rol, navegación de fidelización, tarjeta de métricas y diálogo accesible.
- Los comandos `check` ejecutan compilación, lint, pruebas y, en frontend, validación del sistema de diseño.

## 9. Decisiones que pertenecen al entorno real

El código queda preparado para desplegar, pero ningún repositorio puede decidir por sí solo proveedor, dominio, TLS, SMTP, política de backup, alertas o escalado. Antes de producción deben completarse esas variables, restaurar un backup de prueba, ejecutar el preflight y hacer smoke tests. Si se despliegan varias réplicas de la API, el rate limit en memoria debe moverse a Redis, al gateway o al WAF.

## 10. Reservas de autoservicio

- La pantalla del cliente dejó de ser provisional: ahora consulta sucursales, zonas, horarios y productos habilitados, valida disponibilidad y registra la solicitud real.
- El cliente puede consultar su historial y detalle, filtrar, paginar, informar pagos, reprogramar estados permitidos y cancelar respetando el plazo configurable.
- El backend fuerza el propietario desde la sesión. Un cliente no puede consultar o modificar reservas ajenas, alterar penalidades ni crear reservas para otra identidad.
- La reprogramación excluye la propia reserva del cálculo de colisiones y conserva historial transaccional.
- Administración incorpora vista de lista y calendario mensual con el mismo detalle operativo.

## 11. Permisos y reautenticación crítica

- La autorización ya no depende solo del nombre del rol. Cada solicitud autenticada carga los permisos activos de PostgreSQL y los endpoints sensibles exigen permisos concretos.
- Se añadió `/admin/roles` como módulo independiente para administrar permisos con menor privilegio; exige reautenticación, protege al administrador general e invalida las sesiones del rol modificado.
- La anulación de venta, la reapertura de caja y el respaldo manual requieren volver a confirmar la contraseña del operador.
- Se agregó un índice único parcial que garantiza en PostgreSQL una sola caja abierta por vendedor, incluso ante solicitudes concurrentes.
- La reapertura de una caja cerrada está limitada a administradores, exige un motivo auditable y se rechaza si existe una caja posterior.

## 12. Reportes, tickets y continuidad

- Los reportes pueden descargarse como XLSX real, con hojas estructuradas, o como PDF preparado para archivo y distribución.
- El ticket permite impresión en papel de 58 mm u 80 mm e identifica copias y reimpresiones.
- Se incorporó un módulo de respaldos con ejecución manual y programada, estados, checksum SHA-256, retención, exclusión entre ejecuciones y panel exclusivo para administración general.
- La restauración no se expone por HTTP: se realiza con una herramienta de mantenimiento que exige habilitación temporal, archivo dentro del directorio autorizado, nombre de base confirmado y checksum válido.

## 13. Versionado y sesiones

- La ruta recomendada es `/api/v1`; `/api` queda como alias temporal para no romper clientes anteriores.
- Las sesiones autenticadas se renuevan periódicamente sin exponer el JWT y preservan la protección CSRF.

## 14. Cobertura de calidad actualizada

- Backend: 13 pruebas para seguridad HTTP, sesión, operaciones de pago, autorización por permisos y esquemas de reserva.
- Frontend: 21 pruebas para API/descargas, navegación, permisos de rutas, fidelización y componentes compartidos.
- El preflight detecta también vendedores con más de una caja abierta antes de aplicar el índice de integridad.
