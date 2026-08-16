# Trazabilidad funcional

Esta matriz conecta los bloques definidos inicialmente para El Vallecito de Chocco con la solución actual. “Implementado” significa que existe lógica de frontend, API y persistencia cuando el flujo lo requiere; “Operativo externo” identifica decisiones que dependen del entorno de despliegue.

| Área | Estado | Ruta o módulo actual | Controles principales |
| --- | --- | --- | --- |
| Autenticación y clientes | Implementado | `/login`, `/auth/*` | Cookies HttpOnly, CSRF, rate limit, verificación de correo, recuperación y Google validado |
| Roles, usuarios y permisos | Implementado | `/admin/usuarios`, `/admin/roles` | Menor privilegio, reautenticación, ámbito de sucursal, baja lógica y sesiones revocables |
| Sucursales y disponibilidad | Implementado | `/admin/sucursales` | Horarios, cierres, zonas, aforo y exclusión transaccional |
| Catálogo | Implementado | `/admin/productos` | Categorías, productos, asignación por sucursal y estados |
| Inventario | Implementado | `/admin/inventario` | Stock permanente/diario, movimientos, compromisos y constraints |
| Reservas | Implementado | `/reservations`, `/admin/reservas` | Autoservicio, disponibilidad, calendario, adelantos conciliados con caja, constancia imprimible, aprobación, reprogramación, cancelación e historial |
| Pedidos | Implementado | `/admin/pedidos`, `/operacion/pedidos` | Conversión idempotente de la reserva atendida, estados, detalles, reservas de stock y control concurrente |
| Comandas/cocina | Implementado | `/admin/comandas`, `/operacion/cocina` | Cola operativa, destinos, preparación y métricas con patrón común |
| Entregas | Implementado | `/admin/entregas`, `/operacion/entregas` | Retiro, entrega, validación de estados e historial |
| Caja, ventas y gastos | Implementado | `/admin/ventas`, `/operacion/ventas` | Una caja abierta, adelantos separados de ventas, cobro del saldo, pagos idempotentes, cierre/reapertura, anulaciones reautenticadas y gastos |
| Tickets | Implementado | `/admin/ventas/ticket/:id` | Datos fiscales disponibles, 58/80 mm y marca de reimpresión |
| Fidelización y premios | Implementado | `/admin/fidelizacion`, `/fidelizacion`, `/fidelizacion/programas`; API `GET /api/v1/loyalty/programs/available` | Progreso por ciclo, premios disponibles, catálogo vigente aun sin progreso, alcance real por sucursal, DTO cliente mínimo y navegación anidada coherente |
| Promociones | Implementado | `/admin/promociones`, `/fidelizacion/promociones`; API `GET /api/v1/promotions/available` | Solo promociones activas, automáticas, vigentes, no agotadas y aplicables a productos/sucursales disponibles; cupo interno no expuesto |
| Reportes | Implementado | `/admin/reportes` | Resumen consolidado, adelantos/ventas sin duplicidad, trazabilidad por caja y constancia, filtros y exportación XLSX/PDF |
| Auditoría y configuración | Implementado | `/admin/configuracion` | Registro de mutaciones, parámetros y datos sensibles censurados |
| Respaldos | Implementado | `/admin/respaldos` | Programación, exclusión, checksum, retención y restauración fuera de HTTP |
| API y salud | Implementado | `/api/v1`, `/api/v1/health`, `/api/v1/ready` | Versionado, compatibilidad temporal y readiness con PostgreSQL |
| Contenedores | Preparado, no validado localmente | `docker-compose.yml`, Dockerfiles | Imágenes multi-stage, usuario no root, migración separada y redes internas |
| TLS, dominio, SMTP, monitoreo y copia externa | Operativo externo | Proveedor por definir | Deben configurarse y probarse antes de producción real |

## Ruta recomendada desde el estado actual

1. Instalar Docker y ejecutar el entorno completo con Compose.
2. Probar migraciones sobre una copia realista y ejecutar `production:preflight`.
3. Crear un respaldo, copiarlo fuera del contenedor y ensayar una restauración aislada.
4. Configurar dominio, TLS, SMTP y secretos mediante el gestor del proveedor.
5. Añadir métricas/alertas y, si habrá varias réplicas, trasladar el rate limit a Redis, gateway o WAF.
6. Ejecutar aceptación por rol y promover primero a staging; solo después desplegar producción.
