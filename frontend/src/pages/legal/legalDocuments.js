import { LEGAL_PROVIDER, LEGAL_VERSIONS } from "../../config/legal.config";

const provider = `${LEGAL_PROVIDER.legalName}, RUC ${LEGAL_PROVIDER.ruc}, con domicilio en ${LEGAL_PROVIDER.address}`;

export const legalDocuments = {
    terms: {
        title: "Términos y Condiciones de Uso",
        version: LEGAL_VERSIONS.terms,
        intro: `Estos términos regulan el acceso y uso del sitio y del sistema de ${LEGAL_PROVIDER.tradeName}, operado por ${provider}.`,
        sections: [
            {
                title: "1. Alcance y aceptación",
                paragraphs: ["Al crear una cuenta o utilizar funciones transaccionales declaras haber leído y aceptado estos términos. Si actúas en representación de otra persona, declaras contar con autorización suficiente."]
            },
            {
                title: "2. Cuenta y seguridad",
                bullets: [
                    "Debes proporcionar información verdadera, actual y suficiente.",
                    "Eres responsable de proteger tus credenciales y de avisar cualquier uso no autorizado.",
                    "Podemos bloquear temporalmente accesos cuando existan indicios razonables de fraude, abuso o riesgo para el sistema."
                ]
            },
            {
                title: "3. Reservas, pedidos y pagos",
                paragraphs: ["Las solicitudes están sujetas a disponibilidad y confirmación. Los precios, adelantos, medios de pago y condiciones aplicables se muestran antes de confirmar cada operación. Una constancia de envío no reemplaza la confirmación de la reserva ni el comprobante de pago."],
                bullets: [
                    "No almacenamos datos completos de tarjetas en este sistema.",
                    "Los pagos informados por transferencia, Yape o Plin requieren validación cuando así se indique.",
                    "Las cancelaciones y devoluciones se rigen por la Política de Reservas y Cancelaciones."
                ]
            },
            {
                title: "4. Uso permitido",
                paragraphs: ["No puedes intentar vulnerar controles de seguridad, suplantar identidades, automatizar tráfico abusivo, alterar registros ni usar el servicio para fines ilícitos. El contenido, diseño, marcas y software pertenecen a sus respectivos titulares."]
            },
            {
                title: "5. Disponibilidad y responsabilidad",
                paragraphs: ["Aplicamos medidas razonables de continuidad y seguridad, pero pueden existir mantenimientos o interrupciones fuera de nuestro control. Nada en estos términos limita los derechos irrenunciables reconocidos al consumidor por la legislación peruana."]
            },
            {
                title: "6. Cambios, contacto y controversias",
                paragraphs: [`Publicaremos la versión y fecha de cada actualización. Los cambios sustanciales requerirán una nueva aceptación cuando corresponda. Puedes contactarnos en ${LEGAL_PROVIDER.email} o ${LEGAL_PROVIDER.phone}, usar el Libro de Reclamaciones y acudir a las autoridades competentes.`]
            }
        ]
    },
    privacy: {
        title: "Política de Privacidad y Protección de Datos",
        version: LEGAL_VERSIONS.privacy,
        intro: `${LEGAL_PROVIDER.legalName} informa cómo trata los datos personales de clientes, usuarios y personas que presentan consultas o reclamos.`,
        sections: [
            {
                title: "1. Responsable y banco de datos",
                paragraphs: [`Responsable: ${provider}. Correo para privacidad: ${LEGAL_PROVIDER.email}. Inscripción o código del banco de datos personales: ${LEGAL_PROVIDER.dataBankRegistration}.`]
            },
            {
                title: "2. Datos que tratamos",
                bullets: [
                    "Identificación y contacto: nombres, apellidos, documento, correo, teléfono y domicilio cuando sea necesario.",
                    "Cuenta y seguridad: proveedor de acceso, verificaciones, sesiones, dirección IP, registros técnicos y auditoría.",
                    "Operaciones: reservas, pedidos, pagos declarados, comprobantes, preferencias y reclamos.",
                    "Información enviada voluntariamente en observaciones, consultas o solicitudes."
                ]
            },
            {
                title: "3. Finalidades y base del tratamiento",
                bullets: [
                    "Crear y proteger la cuenta, gestionar reservas, pedidos, pagos, comprobantes y atención al cliente.",
                    "Cumplir obligaciones legales, tributarias, de seguridad y de protección al consumidor.",
                    "Prevenir fraude, investigar incidentes y mantener trazabilidad operativa.",
                    "Enviar promociones solo cuando exista una autorización válida y separada, que podrá retirarse."
                ]
            },
            {
                title: "4. Destinatarios y transferencias",
                paragraphs: ["Podemos usar proveedores de alojamiento, correo, respaldo y autenticación únicamente para prestar el servicio y bajo obligaciones de seguridad y confidencialidad. El acceso con Google es opcional y puede implicar tratamiento por Google conforme a sus propias condiciones. No vendemos datos personales."]
            },
            {
                title: "5. Conservación y seguridad",
                paragraphs: ["Conservamos la información durante la relación y los plazos necesarios para atender responsabilidades legales, contables, contractuales y de seguridad. Luego se elimina o anonimiza de forma segura. Aplicamos control de acceso, cifrado en tránsito, registros de auditoría, copias de respaldo y revisión de privilegios; ningún sistema es absolutamente infalible."]
            },
            {
                title: "6. Derechos de la persona titular",
                paragraphs: [`Puedes solicitar información, acceso, actualización, inclusión, rectificación, supresión, oposición y revocación del consentimiento escribiendo a ${LEGAL_PROVIDER.email}. Incluye tu identidad, el derecho solicitado y un medio de respuesta. También puedes acudir a la Autoridad Nacional de Protección de Datos Personales.`]
            },
            {
                title: "7. Menores y cambios",
                paragraphs: ["El registro autónomo está dirigido a personas con capacidad legal. Cuando se traten datos de menores, debe intervenir su representante conforme a ley. Los cambios relevantes serán comunicados y, si requieren consentimiento, se solicitará una nueva decisión."]
            }
        ]
    },
    cookies: {
        title: "Política de Cookies",
        version: LEGAL_VERSIONS.cookies,
        intro: "Esta política explica las tecnologías locales usadas por el sitio y te permite controlar las funciones opcionales.",
        sections: [
            {
                title: "1. Cookies necesarias",
                bullets: [
                    "vallecito_session: cookie HttpOnly de sesión y autenticación.",
                    "vallecito_csrf: evita el envío no autorizado de formularios.",
                    "vallecito_cookie_preferences_v1: almacenamiento local de tu decisión de privacidad."
                ],
                paragraphs: ["Estas tecnologías son indispensables para el servicio solicitado y no se usan con fines publicitarios."]
            },
            {
                title: "2. Función opcional de Google",
                paragraphs: ["El script de Google Identity Services solo se carga después de autorizar “Acceso con Google”. Google puede recibir datos técnicos como la dirección IP y el navegador. Puedes usar correo y contraseña sin habilitar esta función."]
            },
            {
                title: "3. Gestión y revocación",
                paragraphs: ["Puedes cambiar tu decisión en cualquier momento. Revocar una función opcional evita cargas futuras, aunque también puedes borrar cookies y almacenamiento desde el navegador."],
                action: "cookies"
            }
        ]
    },
    reservations: {
        title: "Política de Reservas, Cancelaciones y Reembolsos",
        version: LEGAL_VERSIONS.reservations,
        intro: "Lee estas condiciones antes de solicitar una reserva. La pantalla de confirmación mostrará los importes y requisitos concretos de tu operación.",
        sections: [
            {
                title: "1. Solicitud y confirmación",
                paragraphs: ["Enviar una solicitud no garantiza disponibilidad. La reserva queda confirmada cuando el establecimiento la aprueba y, si corresponde, valida el adelanto requerido. Las solicitudes de productos también están sujetas a disponibilidad y cantidades aprobadas."]
            },
            {
                title: "2. Adelantos y saldo",
                paragraphs: ["El importe, plazo y medio de pago se informan en el detalle de la reserva. Los pagos declarados pasan a validación y no se consideran recibidos hasta ser confirmados. El saldo se paga según lo informado para la reserva."]
            },
            {
                title: "3. Cancelación y reprogramación",
                bullets: [
                    "El cliente puede cancelar o solicitar reprogramación desde el sistema dentro del plazo que muestre su reserva.",
                    "La configuración operativa actual exige, como regla general, al menos 24 horas de anticipación para cancelar en línea.",
                    "Fuera de ese plazo debes contactar al establecimiento; la evaluación considera servicios ya preparados, compras especiales y condiciones informadas antes del pago."
                ]
            },
            {
                title: "4. Reembolsos y no asistencia",
                paragraphs: ["Cuando corresponda un reembolso, se informará el monto, medio y plazo antes de procesarlo. Una retención o penalidad solo se aplicará si fue informada de forma clara, resulta proporcional y respeta los derechos del consumidor. La no asistencia puede cerrar la reserva y afectar la devolución de costos efectivamente incurridos."]
            },
            {
                title: "5. Cambios por el establecimiento",
                paragraphs: ["Si el establecimiento no puede prestar el servicio confirmado, ofrecerá reprogramación o devolución según corresponda. Para ayuda, utiliza los canales de contacto o el Libro de Reclamaciones."]
            }
        ]
    }
};
