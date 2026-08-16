import {
    LEGAL_EFFECTIVE_DATES,
    LEGAL_PROVIDER,
    LEGAL_VERSIONS
} from "../../config/legal.config";

const provider = `${LEGAL_PROVIDER.legalName}, ${LEGAL_PROVIDER.providerType}, RUC ${LEGAL_PROVIDER.ruc}, con establecimiento en ${LEGAL_PROVIDER.address}`;
const dataBankRegistration = LEGAL_PROVIDER.dataBankRegistration
    ? ` Inscripción registral: ${LEGAL_PROVIDER.dataBankRegistration}.`
    : " La referencia registral se publicará cuando concluya la evaluación y el trámite que correspondan ante la autoridad.";

export const legalDocuments = {
    terms: {
        title: "Términos y Condiciones de Uso",
        version: LEGAL_VERSIONS.terms,
        effectiveDate: LEGAL_EFFECTIVE_DATES.terms,
        intro: `Estos términos regulan el sitio y el sistema de ${LEGAL_PROVIDER.tradeName}, operado por ${provider}.`,
        sections: [
            {
                title: "1. Alcance y aceptación",
                paragraphs: [
                    "Al crear una cuenta o realizar una operación declaras haber leído y aceptado las condiciones vigentes que se muestran antes de confirmar. Ninguna disposición limita los derechos irrenunciables reconocidos al consumidor por la legislación peruana.",
                    "Las reservas de eventos pueden tener condiciones particulares informadas y aceptadas antes del pago; esas condiciones complementan este documento."
                ]
            },
            {
                title: "2. Cuenta y seguridad",
                bullets: [
                    "Debes proporcionar información verdadera, actual y suficiente.",
                    "Eres responsable de proteger tus credenciales y comunicar cualquier uso no autorizado.",
                    "Podemos bloquear temporalmente un acceso ante indicios razonables de fraude, suplantación, abuso o riesgo para el sistema."
                ]
            },
            {
                title: "3. Reservas, pedidos y pagos",
                paragraphs: [
                    "Las solicitudes están sujetas a horario, disponibilidad, aforo, stock y confirmación del establecimiento. Los importes, adelantos y condiciones aplicables se presentan antes de confirmar.",
                    "Los pagos informados por transferencia, Yape, Plin u otro medio sujeto a verificación no se consideran confirmados hasta su validación. El sistema no almacena datos completos de tarjetas."
                ],
                bullets: [
                    "Las cancelaciones, devoluciones y no asistencias se rigen por la Política de Reservas, Cancelaciones y Reembolsos.",
                    "Una captura o constancia de envío de dinero no sustituye la validación del pago.",
                    "Los pedidos no avanzan cuando el sistema detecta stock insuficiente."
                ]
            },
            {
                title: "4. Boletas y constancias internas",
                paragraphs: [
                    `${LEGAL_PROVIDER.tradeName} entrega actualmente ${LEGAL_PROVIDER.receiptMode.toLowerCase()}. La nota de pedido, ticket interno o constancia generada por el ERP sirve para trazabilidad operativa y no reemplaza por sí sola el comprobante de pago regulado por SUNAT.`,
                    "El número de la boleta física podrá asociarse a la venta dentro del sistema para facilitar su consulta y auditoría."
                ]
            },
            {
                title: "5. Bebidas alcohólicas",
                bullets: [
                    "Está prohibida la venta, suministro y entrega de bebidas alcohólicas a menores de 18 años.",
                    "El establecimiento puede solicitar un documento de identidad antes de vender o entregar una bebida alcohólica.",
                    "Si has ingerido bebidas alcohólicas, no manejes."
                ]
            },
            {
                title: "6. Fidelización, premios y reseñas",
                paragraphs: [
                    "Los beneficios de fidelización se asignan conforme al programa vigente mostrado en la cuenta. Una misma persona registra como máximo una visita computable por día, aunque realice más de un pedido.",
                    "Los premios están sujetos a vigencia, requisitos y disponibilidad. Las operaciones anuladas o fraudulentas no generan beneficios.",
                    "Las reseñas públicas se vinculan a una experiencia verificada, pueden moderarse por contenido ilícito, ofensivo, irrelevante o que exponga datos personales, y el autor puede solicitar su retiro."
                ]
            },
            {
                title: "7. Uso permitido",
                paragraphs: [
                    "No puedes vulnerar controles de seguridad, suplantar identidades, automatizar tráfico abusivo, manipular pagos, alterar registros ni usar el servicio para fines ilícitos. El contenido, diseño, marcas y software pertenecen a sus respectivos titulares."
                ]
            },
            {
                title: "8. Disponibilidad y responsabilidad",
                paragraphs: [
                    "Aplicamos medidas razonables de continuidad y seguridad, pero pueden existir mantenimientos o interrupciones fuera de nuestro control. Informaremos los cambios que afecten una operación confirmada y ofreceremos las alternativas que correspondan."
                ]
            },
            {
                title: "9. Cambios, contacto y reclamos",
                paragraphs: [
                    `Los cambios sustanciales se versionan y requieren una nueva aceptación cuando corresponda. Puedes contactarnos en ${LEGAL_PROVIDER.email}, llamar al ${LEGAL_PROVIDER.phone}, escribir al WhatsApp ${LEGAL_PROVIDER.whatsapp} o utilizar el Libro de Reclamaciones. También puedes acudir a Indecopi u otra autoridad competente.`
                ]
            }
        ]
    },
    privacy: {
        title: "Política de Privacidad y Protección de Datos",
        version: LEGAL_VERSIONS.privacy,
        effectiveDate: LEGAL_EFFECTIVE_DATES.privacy,
        intro: `${LEGAL_PROVIDER.legalName} informa cómo trata los datos personales de clientes, usuarios, trabajadores autorizados y personas que presentan consultas o reclamos.`,
        sections: [
            {
                title: "1. Responsable y banco de datos",
                paragraphs: [
                    `Responsable: ${provider}. Correo para privacidad y derechos de las personas: ${LEGAL_PROVIDER.email}. Banco de datos: ${LEGAL_PROVIDER.dataBankName}.${dataBankRegistration}`
                ]
            },
            {
                title: "2. Datos que tratamos",
                bullets: [
                    "Identificación y contacto: nombres, apellidos, documento, correo, teléfono y domicilio cuando sea necesario.",
                    "Cuenta y seguridad: proveedor de acceso, verificaciones, sesiones, dirección IP, eventos técnicos y auditoría.",
                    "Operaciones: reservas, pedidos, productos, pagos declarados, boletas asociadas, preferencias, fidelización y reclamos.",
                    "Contenido voluntario: observaciones, comprobantes enviados, reseñas y solicitudes de atención."
                ]
            },
            {
                title: "3. Finalidades y legitimación",
                bullets: [
                    "Crear y proteger la cuenta; gestionar reservas, pedidos, pagos, boletas, beneficios y atención al cliente.",
                    "Ejecutar las condiciones solicitadas o aceptadas por la persona usuaria.",
                    "Cumplir obligaciones tributarias, de seguridad, protección al consumidor y atención de derechos.",
                    "Prevenir fraude, investigar incidentes y conservar trazabilidad operativa.",
                    "Enviar publicidad únicamente con autorización separada y revocable."
                ]
            },
            {
                title: "4. Proveedores, destinatarios y transferencias",
                paragraphs: [
                    "Para la etapa provisional podemos utilizar Vercel para el frontend, Render para la API, Supabase para PostgreSQL, Google para autenticación y Brevo para correo transaccional. Estos proveedores actúan como encargados tecnológicos conforme a sus condiciones y pueden tratar información fuera del Perú.",
                    "Las transferencias y encargos aplicables se inventarían, documentan y registran cuando corresponda. No vendemos datos personales. Solo comunicamos información a autoridades cuando existe obligación legal."
                ]
            },
            {
                title: "5. Conservación",
                paragraphs: [
                    "Conservamos la información durante la relación y durante los plazos necesarios para atender responsabilidades tributarias, contractuales, de consumo, seguridad y defensa frente a reclamaciones. Al vencer el plazo aplicable, la información se elimina, bloquea o anonimiza de forma segura."
                ]
            },
            {
                title: "6. Seguridad e incidentes",
                paragraphs: [
                    "Aplicamos controles de acceso por rol, cifrado en tránsito, cookies seguras, registros de auditoría, copias de respaldo y revisión de privilegios. Ante un incidente se limitará el acceso afectado, se preservará evidencia y se realizarán las comunicaciones exigibles. Ningún sistema puede garantizar riesgo cero."
                ]
            },
            {
                title: "7. Derechos de la persona titular",
                paragraphs: [
                    `Puedes solicitar información, acceso, actualización, inclusión, rectificación, supresión, oposición o revocación escribiendo a ${LEGAL_PROVIDER.email}. Indica tu identidad, el derecho que deseas ejercer y un medio de respuesta. También puedes acudir a la Autoridad Nacional de Protección de Datos Personales.`
                ]
            },
            {
                title: "8. Menores y cambios",
                paragraphs: [
                    "El registro autónomo está dirigido a personas con capacidad legal. Cuando corresponda tratar datos de una persona menor de edad, debe intervenir su padre, madre o representante conforme a ley. Los cambios relevantes se comunicarán y se solicitará una nueva decisión cuando sea necesario."
                ]
            }
        ]
    },
    cookies: {
        title: "Política de Cookies",
        version: LEGAL_VERSIONS.cookies,
        effectiveDate: LEGAL_EFFECTIVE_DATES.cookies,
        intro: "Esta política explica las tecnologías locales usadas por el sitio y permite controlar las funciones opcionales.",
        sections: [
            {
                title: "1. Cookies necesarias",
                bullets: [
                    "vallecito_session: cookie HttpOnly de sesión y autenticación.",
                    "vallecito_csrf: evita el envío no autorizado de formularios.",
                    "vallecito_cookie_preferences_v1: almacenamiento local de la decisión de privacidad."
                ],
                paragraphs: ["Estas tecnologías son indispensables para el servicio solicitado y no se usan con fines publicitarios."]
            },
            {
                title: "2. Función opcional de Google",
                paragraphs: ["Google Identity Services solo se carga después de autorizar Acceso con Google. Google puede recibir datos técnicos como la dirección IP y el navegador. Puedes usar correo y contraseña sin habilitar esta función."]
            },
            {
                title: "3. Gestión y revocación",
                paragraphs: ["Puedes cambiar tu decisión en cualquier momento. Revocar una función opcional evita cargas futuras; también puedes borrar cookies y almacenamiento desde el navegador."],
                action: "cookies"
            }
        ]
    },
    reservations: {
        title: "Política de Reservas, Cancelaciones y Reembolsos",
        version: LEGAL_VERSIONS.reservations,
        effectiveDate: LEGAL_EFFECTIVE_DATES.reservations,
        intro: "Estas condiciones se muestran antes de solicitar una reserva y distinguen las reservas regulares de comida de los eventos.",
        sections: [
            {
                title: "1. Solicitud y confirmación",
                paragraphs: [
                    "Enviar una solicitud no garantiza disponibilidad. La reserva queda confirmada cuando el establecimiento la aprueba y, si corresponde, valida el adelanto requerido.",
                    "Las cantidades y productos solicitados están sujetos a disponibilidad y stock."
                ]
            },
            {
                title: "2. Adelantos y saldo",
                paragraphs: [
                    "El importe, plazo y medio de pago aparecen en el detalle de la reserva. Un pago declarado permanece pendiente hasta su validación. El saldo se paga según las condiciones informadas para la reserva."
                ]
            },
            {
                title: "3. Reserva regular de comida",
                bullets: [
                    "La cancelación realizada al menos una hora antes del inicio permite devolver el 100 % del adelanto confirmado.",
                    "Dentro de la última hora, la cancelación en línea se cierra y el cliente debe comunicarse con el establecimiento.",
                    "En una cancelación tardía o si el cliente no se presenta, se devuelve el 50 % del adelanto y se retiene el 50 % por la preparación y capacidad reservada.",
                    "La reprogramación debe solicitarse antes del límite de cancelación y está sujeta a disponibilidad."
                ]
            },
            {
                title: "4. Reservas de eventos",
                paragraphs: [
                    `Las fechas, productos, aforo, adelanto, cancelación y devolución de un evento se coordinan directamente mediante ${LEGAL_PROVIDER.phone} o WhatsApp ${LEGAL_PROVIDER.whatsapp}. Las condiciones particulares deben quedar informadas y aceptadas antes de solicitar el pago.`
                ]
            },
            {
                title: "5. Procesamiento de devoluciones",
                paragraphs: [
                    "El sistema registra el monto que corresponde devolver y conserva la trazabilidad del pago. La entrega efectiva se coordina por el medio original cuando sea posible o por otro medio acordado, dejando constancia de la operación."
                ]
            },
            {
                title: "6. Cambios por el establecimiento",
                paragraphs: [
                    "Si el establecimiento no puede prestar el servicio confirmado, ofrecerá reprogramación o devolución total del importe recibido. Para ayuda utiliza los canales de contacto o el Libro de Reclamaciones."
                ]
            }
        ]
    }
};
