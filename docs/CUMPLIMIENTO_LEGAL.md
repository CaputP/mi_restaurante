# Cumplimiento legal y operativo

Esta guía documenta la implementación técnica de privacidad, contratación digital y atención al consumidor. No reemplaza la revisión de un abogado peruano ni los trámites que correspondan ante las autoridades.

## Funciones implementadas

- Términos y Condiciones: `/legal/terminos`.
- Política de Privacidad: `/legal/privacidad`.
- Política de Cookies y centro de preferencias: `/legal/cookies`.
- Política de Reservas, Cancelaciones y Reembolsos: `/legal/reservas-cancelaciones`.
- Libro de Reclamaciones público y constancia imprimible: `/libro-de-reclamaciones`.
- Bandeja de gestión: `/admin/reclamaciones`, limitada a administradores con `RECLAMO_GESTIONAR`.
- Evidencia versionada de aceptación en cuentas y reservas.
- Carga diferida de Google Identity Services hasta autorizar esa función opcional.

## Datos obligatorios antes del despliegue

No publicar mientras exista un valor `replace-with-*` o “Dato pendiente de configuración”. Completar razón social, RUC, domicilio, correo, teléfono y la referencia aplicable del banco de datos en las variables `LEGAL_*`, `DATA_BANK_REGISTRATION` y sus equivalentes `VITE_*`.

Los valores `VITE_*` quedan incluidos en el paquete web y son públicos; nunca colocar secretos en ellos.

## Evidencia y versiones

La versión vigente es `1.0-2026-08-08`. Backend y frontend deben cambiar juntos:

- `backend/src/shared/legal/legal-versions.ts`.
- `frontend/src/config/legal.config.js`.

Ante un cambio material debe crearse una versión, conservar la anterior, decidir si se requiere nueva aceptación y registrar responsable y fundamento.

La cuenta almacena fecha y versión de términos y privacidad. Cada reserva de cliente almacena fecha y versión de su política. El reclamo almacena la versión de privacidad y genera un token de consulta; únicamente se persiste su hash SHA-256.

## Libro de Reclamaciones

El formulario recoge identificación, domicilio, contacto, producto o servicio, monto cuando aplica, detalle y pedido. Para menores exige apoderado. Al guardar:

1. Genera un código `LR-AAAAMMDD-*` y una clave privada aleatoria.
2. Devuelve una constancia imprimible e intenta enviarla por correo.
3. Un fallo del correo no elimina ni revierte el registro.
4. Limita el formulario a cinco envíos por IP por hora, además del límite global de la API.
5. Vincula la respuesta administrativa al usuario y fecha de atención.

El enlace de constancia contiene una clave privada y no debe publicarse. Un administrador de sucursal solo consulta registros de sus sedes asignadas.

## Decisiones pendientes de la organización

- Plazos de conservación por categoría y obligación tributaria o de consumo.
- Procedimiento y responsables para derechos sobre datos personales.
- Registro de bancos de datos que corresponda.
- Inventario de encargados, contratos, alojamiento y transferencias.
- Procedimiento de incidentes de seguridad y notificación.
- Condiciones comerciales finales de adelantos, penalidades, devoluciones y no asistencia.
- Control diario del plazo de respuesta de reclamos y canal alternativo ante fallos de correo.

## Lista de salida a producción

- [ ] Identidad legal, RUC, domicilio, correo y teléfono verificados.
- [ ] Políticas revisadas por asesoría legal y aprobadas por el negocio.
- [ ] SMTP real configurado y probado; no usar `EMAIL_MODE=console` en producción.
- [ ] Migraciones aplicadas y permiso `RECLAMO_GESTIONAR` asignado.
- [ ] Libro visible desde la página de inicio en escritorio y móvil.
- [ ] Prueba completa: cuenta, reserva, reclamo, constancia, correo, respuesta y reconsulta.
- [ ] Responsable y alerta interna para reclamos próximos a vencer.
- [ ] Copias cifradas y restauración ensayada.
- [ ] Revisión de cookies al añadir analítica, publicidad, mapas u otros terceros.
