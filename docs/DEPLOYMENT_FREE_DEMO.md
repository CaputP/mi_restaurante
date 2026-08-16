# Despliegue gratuito temporal

Esta ruta publica el sistema completo como entorno de demostración:

- frontend React en Vercel Hobby;
- API Express en Render Free;
- PostgreSQL en Supabase Free;
- correo transaccional mediante Brevo Free por el puerto `2525`.

No es una arquitectura de producción. Vercel Hobby limita su uso a proyectos personales no comerciales, Render Free se suspende tras 15 minutos sin tráfico y Supabase puede pausar proyectos Free con baja actividad. No se deben ingresar datos personales, pagos ni operaciones reales mientras se use esta modalidad.

## 1. Preparar cuentas

Crear cuentas gratuitas en GitHub, Supabase, Render, Vercel y Brevo. Activar autenticación multifactor en todas. El repositorio debe estar en GitHub sin archivos `.env`, contraseñas, claves SMTP ni copias de la base de datos.

## 2. Crear PostgreSQL en Supabase

1. Crear un proyecto Free y guardar su contraseña en un gestor de contraseñas.
2. En **Connect**, copiar la conexión **Session pooler**, cuyo puerto termina en `5432`.
3. Usar esa cadena completa como `DATABASE_URL` en Render. La aplicación es un servidor persistente y utiliza conexiones PostgreSQL de sesión y `LISTEN/NOTIFY`; no corresponde usar el pooler de transacciones del puerto `6543`.
4. Si la contraseña contiene caracteres reservados de una URL, utilizar la cadena ya codificada que entrega Supabase o codificarlos correctamente.

No crear tablas manualmente. Render ejecutará todas las migraciones Prisma y luego el `seed` idempotente. El `seed` crea roles, permisos, la sucursal, catálogos y correlativos; no crea ventas ni datos demo.

## 3. Preparar correo gratuito en Brevo

Render Free bloquea los puertos SMTP `25`, `465` y `587`. La configuración incluida usa el relay de Brevo por `2525`.

1. Crear la cuenta Brevo con `elvallecitodechocco@gmail.com`.
2. Verificar el remitente solicitado por Brevo.
3. En **SMTP & API**, crear una clave SMTP. No usar la API key ni la contraseña de Gmail.
4. Guardar el **SMTP login** como `SMTP_USER` y la **SMTP key** como `SMTP_PASSWORD` en Render.

Mientras se use una dirección gratuita `gmail.com`, Brevo puede reemplazar temporalmente el dominio visible del remitente. Cuando se compre un dominio, se debe crear una cuenta como `notificaciones@dominio`, configurar SPF, DKIM y DMARC, y actualizar `MAIL_FROM`.

## 4. Reservar la URL del frontend

El frontend ya está publicado en `https://mi-restaurante-psi.vercel.app`. Esta dirección, sin barra final, quedó configurada como `FRONTEND_URL` en `render.yaml`. El primer frontend puede estar disponible aunque la API todavía no exista.

## 5. Crear el backend en Render

El archivo `render.yaml` define el servicio. En Render:

1. Elegir **New > Blueprint** y conectar el repositorio.
2. Confirmar el servicio `el-vallecito-api-demo` con plan Free.
3. Completar las variables marcadas como secretas:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Session pooler de Supabase, puerto `5432` |
| `FRONTEND_URL` | Ya configurada como `https://mi-restaurante-psi.vercel.app` |
| `GOOGLE_CLIENT_ID` | ID OAuth Web ya utilizado por el sistema |
| `SMTP_USER` | Login SMTP de Brevo |
| `SMTP_PASSWORD` | Clave SMTP de Brevo |
| `ADMIN_EMAIL` | Correo privado del administrador inicial |
| `ADMIN_PASSWORD` | Contraseña única de 16 o más caracteres |
| `ADMIN_NOMBRES` | Nombres del administrador |
| `ADMIN_APELLIDOS` | Apellidos del administrador |
| `ADMIN_TELEFONO` | Teléfono del administrador, opcional |

`JWT_SECRET` lo genera Render y no debe copiarse al frontend. En cada arranque se aplican migraciones, se sincronizan los datos estructurales y finalmente se inicia la API. El proceso es idempotente y no elimina operaciones existentes.

Al terminar, verificar:

```text
https://el-vallecito-api-demo.onrender.com/api/v1/health
https://el-vallecito-api-demo.onrender.com/api/v1/ready
```

Ambas rutas deben responder `200`. Si Render asigna otro subdominio, actualizar también el destino `/api/:path*` en `frontend/vercel.json`.

## 6. Completar el frontend en Vercel

1. Importar el mismo repositorio.
2. Establecer **Root Directory** en `frontend`.
3. Framework preset: **Vite**. Build command: `npm run build`. Output: `dist`.
4. Registrar estas variables de producción:

| Variable | Valor |
| --- | --- |
| `VITE_API_URL` | `/api/v1` |
| `VITE_GOOGLE_CLIENT_ID` | El mismo ID OAuth Web del backend |
| `VITE_LEGAL_BUSINESS_NAME` | `MENDOZA HUAMANI GRACIELA` |
| `VITE_LEGAL_RUC` | `10250028747` |
| `VITE_LEGAL_ADDRESS` | `Comunidad Chocco Kuychiro s/n, Santiago, Cusco, Cusco, Perú` |
| `VITE_LEGAL_EMAIL` | `elvallecitodechocco@gmail.com` |
| `VITE_LEGAL_PHONE` | `+51 994 744 356` |
| `VITE_LEGAL_SECONDARY_PHONE` | `+51 925 957 233` |
| `VITE_DATA_BANK_REGISTRATION` | Vacío hasta obtener el número aplicable |

La reescritura de Vercel mantiene navegador y API bajo el mismo origen visible. Esto permite conservar cookies `HttpOnly`, protección CSRF y `SameSite=Lax` sin exponer el token al JavaScript.

## 7. Configurar Google OAuth

En Google Cloud Console, agregar `https://mi-restaurante-psi.vercel.app` a **Authorized JavaScript origins**. No agregar rutas ni barra final. Conservar `http://localhost:5173` únicamente para desarrollo.

## 8. Pruebas obligatorias

Realizar con datos ficticios:

1. abrir la página pública, políticas y Libro de Reclamaciones;
2. registrar y verificar una cuenta por correo;
3. iniciar y cerrar sesión con contraseña y con Google;
4. crear una reserva, registrar un adelanto y validar su notificación;
5. crear un pedido con stock, enviarlo a cocina y caja, cobrar e imprimir;
6. cancelar una reserva de prueba y comprobar la regla de una hora;
7. crear un reclamo, descargar su constancia y revisar la bandeja administrativa;
8. comprobar que los cambios de estados y notificaciones aparecen sin recargar.

Después de comprobar el administrador inicial, eliminar `ADMIN_PASSWORD` de Render. Los siguientes arranques conservarán al usuario existente. También se puede retirar el resto de variables `ADMIN_*` una vez verificado el acceso.

## 9. Límites y paso a producción

- El primer acceso a la API puede tardar cerca de un minuto cuando Render está suspendido.
- El sistema de copias dentro de Render no es durable en Free porque su disco es efímero. Ejecutar exportaciones manuales cifradas de Supabase y guardarlas fuera de ambos proveedores.
- Supabase Free no ofrece copias automáticas descargables y puede pausarse por baja actividad.
- Los procesos programados no son confiables cuando el backend duerme.
- El plan gratuito es exclusivamente para demostración y pruebas; no para operar el restaurante.

Para datos reales se debe migrar al plan pagado acordado, añadir dominio propio, correo del dominio, respaldo externo automatizado, monitoreo, alertas y revisión legal final. En una arquitectura con varias réplicas, las migraciones deben moverse a un trabajo único previo al despliegue y no ejecutarse desde cada réplica.
