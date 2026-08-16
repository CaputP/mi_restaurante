# Inventario de protección de datos personales

Documento de trabajo para completar la evaluación y los trámites de protección de datos personales en Perú. No reemplaza asesoría legal ni la inscripción que determine la Autoridad Nacional de Protección de Datos Personales.

## Identificación confirmada

| Campo | Información |
| --- | --- |
| Titular del negocio | MENDOZA HUAMANI GRACIELA |
| Tipo | Persona natural con negocio |
| Nombre comercial | El Vallecito de Chocco |
| RUC | 10250028747 |
| Estado SUNAT | Activo y habido |
| Actividad principal | Restaurantes y servicio móvil de comidas |
| Domicilio del establecimiento | Comunidad Chocco Kuychiro s/n, distrito de Santiago, provincia y departamento de Cusco, Perú |
| Correo de contacto y privacidad | elvallecitodechocco@gmail.com |
| WhatsApp principal | +51 994 744 356 |
| Teléfono secundario | +51 925 957 233 |
| Comprobante actual | Boleta de venta física |

## Banco de datos propuesto

Nombre de trabajo: **Clientes, usuarios y reclamaciones de El Vallecito de Chocco**.

Categorías tratadas:

- identificación y contacto de clientes y usuarios;
- credenciales cifradas, sesiones y registros de seguridad;
- reservas, pedidos, pagos declarados, boletas asociadas y fidelización;
- reclamos, respuestas, constancias y evidencias de aceptación;
- datos de personal autorizado para operar el ERP;
- direcciones IP y auditoría técnica necesarias para seguridad y trazabilidad.

Finalidades principales:

- ejecutar reservas, pedidos, ventas, devoluciones y atención al cliente;
- administrar cuentas, permisos, seguridad y recuperación de acceso;
- emitir o asociar comprobantes y conservar trazabilidad contable-operativa;
- operar fidelización y reseñas verificadas;
- atender reclamos y derechos sobre datos personales;
- prevenir fraude, investigar incidentes y cumplir obligaciones legales.

No se deben usar datos para publicidad sin una autorización independiente, opcional y revocable.

## Encargados tecnológicos provisionales

| Proveedor | Uso | Información involucrada | Estado |
| --- | --- | --- | --- |
| Vercel | Publicación del frontend | metadatos técnicos y tráfico web | Demo temporal |
| Render | Ejecución de la API | operaciones, sesiones y registros técnicos | Demo temporal |
| Supabase | Base PostgreSQL | información operativa y personal del ERP | Demo temporal |
| Google | Acceso OAuth | identidad básica y correo | Configuración existente por verificar |
| Brevo | Correo transaccional | nombre, correo y contenido del mensaje | Pendiente crear cuenta/clave |

Antes de datos reales se deben conservar los términos y acuerdos de tratamiento aplicables, registrar los flujos internacionales que correspondan y verificar ubicación, subencargados, conservación y mecanismo de eliminación de cada proveedor.

## Controles implementados

- autorización por roles y sucursal;
- sesiones en cookie `HttpOnly`, `Secure` en producción y protección CSRF;
- contraseñas con hash y verificación de correo;
- validación de entradas, límites de solicitudes y encabezados de seguridad;
- auditoría de operaciones sensibles;
- aceptación versionada de términos, privacidad y reservas;
- Libro de Reclamaciones virtual con token de consulta no almacenado en texto plano;
- correos transaccionales sin incluir contraseñas ni secretos;
- migraciones controladas y respaldo lógico disponible.

## Acciones externas pendientes

- [ ] Confirmar con asesoría peruana si corresponde inscribir el banco de datos y realizar el trámite ante la ANPD.
- [ ] Designar por escrito a la persona responsable de privacidad y del correo de derechos ARCO.
- [ ] Definir y aprobar una tabla de conservación por categoría documental.
- [ ] Documentar el proceso para acceso, rectificación, cancelación, oposición y demás derechos aplicables.
- [ ] Firmar o aceptar los acuerdos de tratamiento de los proveedores definitivos.
- [ ] Crear un procedimiento de incidentes: contención, evidencia, evaluación, notificación y lecciones aprendidas.
- [ ] Crear y señalizar el Libro de Reclamaciones físico del establecimiento y mantener el virtual visible.
- [ ] Comprar un dominio y configurar SPF, DKIM y DMARC para correo confiable.
- [ ] Pasar a infraestructura pagada antes de almacenar datos u operaciones reales.
- [ ] Solicitar revisión final de las políticas versión `1.1-2026-08-15`.

El número de inscripción del banco de datos debe añadirse a `DATA_BANK_REGISTRATION` y `VITE_DATA_BANK_REGISTRATION` únicamente después de obtenerlo oficialmente.
