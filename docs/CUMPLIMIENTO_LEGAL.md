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

## Datos confirmados

- Titular: MENDOZA HUAMANI GRACIELA, persona natural con negocio.
- Nombre comercial: El Vallecito de Chocco.
- RUC: 10250028747, activo y habido según la consulta entregada.
- Dirección: Comunidad Chocco Kuychiro s/n, Santiago, Cusco, Cusco, Perú.
- Correo: `elvallecitodechocco@gmail.com`.
- WhatsApp principal: +51 994 744 356. Teléfono secundario: +51 925 957 233.
- Emisión declarada: boletas de venta físicas. Los tickets del ERP son constancias internas y no sustituyen el comprobante regulado por SUNAT.
- Venta de cerveza: el sistema y los términos prohíben su venta o entrega a menores de 18 años.

La referencia registral del banco de datos continúa pendiente. `DATA_BANK_REGISTRATION` y `VITE_DATA_BANK_REGISTRATION` deben permanecer vacías hasta obtener un número oficial; nunca se debe inventar uno.

Los valores `VITE_*` quedan incluidos en el paquete web y son públicos; nunca colocar secretos en ellos.

## Evidencia y versiones

Las versiones vigentes de términos, privacidad y reservas son `1.1-2026-08-15`; cookies permanece en `1.0-2026-08-08`. Backend y frontend deben cambiar juntos:

- `backend/src/shared/legal/legal-versions.ts`.
- `frontend/src/config/legal.config.js`.

Ante un cambio material debe crearse una versión, conservar la anterior, decidir si se requiere nueva aceptación y registrar responsable y fundamento.

La cuenta almacena fecha y versión de términos y privacidad. Cada reserva de cliente almacena fecha y versión de su política. El reclamo almacena la versión de privacidad y genera un token de consulta; únicamente se persiste su hash SHA-256.

## Libro de Reclamaciones

El formulario recoge identificación, domicilio, contacto, producto o servicio, monto cuando aplica, detalle y pedido. Para menores exige apoderado. Al guardar:

1. Genera un código correlativo con año `LR-AAAA-NNNNNNNN` y una clave privada aleatoria.
2. Devuelve una constancia imprimible e intenta enviarla por correo.
3. Un fallo del correo no elimina ni revierte el registro.
4. Limita el formulario a cinco envíos por IP por hora, además del límite global de la API.
5. Vincula la respuesta administrativa al usuario y fecha de atención.

El enlace de constancia contiene una clave privada y no debe publicarse. Un administrador de sucursal solo consulta registros de sus sedes asignadas.

## Condiciones de reservas aprobadas

- Reserva regular de comida cancelada al menos una hora antes: devolución del 100 % del adelanto confirmado.
- Cancelación dentro de la última hora o no asistencia: devolución del 50 % y retención del 50 % por preparación y capacidad reservada.
- Eventos: condiciones, adelanto y devolución se coordinan directamente y deben quedar aceptados antes del pago.
- Si el establecimiento no puede atender una reserva confirmada: reprogramación o devolución total.

## Decisiones y trámites externos pendientes

- Plazos de conservación por categoría y obligación tributaria o de consumo.
- Procedimiento y responsables para derechos sobre datos personales.
- Confirmación e inscripción de bancos de datos que corresponda ante la ANPD.
- Inventario de encargados, contratos, alojamiento y transferencias.
- Procedimiento de incidentes de seguridad y notificación.
- Libro de Reclamaciones físico y aviso visible en el establecimiento; el libro virtual del sistema ya está implementado.
- Dominio propio y correo transaccional autenticado con SPF, DKIM y DMARC.
- Control diario del plazo de respuesta de reclamos y canal alternativo ante fallos de correo.

## Lista de salida a producción

- [x] Identidad legal, RUC, domicilio, correo y teléfono incorporados.
- [ ] Políticas revisadas por asesoría legal y aprobadas por el negocio.
- [ ] SMTP real configurado y probado; no usar `EMAIL_MODE=console` en producción.
- [ ] Migraciones aplicadas y permiso `RECLAMO_GESTIONAR` asignado.
- [ ] Libro visible desde la página de inicio en escritorio y móvil.
- [ ] Prueba completa: cuenta, reserva, reclamo, constancia, correo, respuesta y reconsulta.
- [ ] Responsable y alerta interna para reclamos próximos a vencer.
- [ ] Copias cifradas y restauración ensayada.
- [ ] Revisión de cookies al añadir analítica, publicidad, mapas u otros terceros.
- [ ] Banco de datos y flujo internacional revisados; número oficial añadido solo si corresponde.
- [ ] Libro físico disponible y aviso visible en el local.
