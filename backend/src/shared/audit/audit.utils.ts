import type {
  Prisma,
} from "../../generated/prisma/client.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SENSITIVE_PARTS = [
  "PASSWORD",
  "CONTRASENA",
  "CONTRASEÑA",
  "SECRET",
  "TOKEN",
  "HASH",
  "DATABASE_URL",
  "API_KEY",
  "ACCESS_KEY",
  "PRIVATE_KEY",
  "CLIENT_SECRET",
];

const MODULE_NAMES:
  Record<string, string> = {
    users: "USUARIOS",
    branches: "SUCURSALES",
    settings: "CONFIGURACION",
    reservations: "RESERVAS",
    orders: "PEDIDOS",
    commands: "COMANDAS",
    deliveries: "ENTREGAS",
    cash: "CAJA",
    sales: "VENTAS",
    expenses: "GASTOS",
    inventory: "INVENTARIO",
    products: "PRODUCTOS",
    catalog: "PRODUCTOS",
  };

const ENTITY_NAMES:
  Record<string, string> = {
    users: "USUARIO",
    branches: "SUCURSAL",
    settings: "CONFIGURACION",
    reservations: "RESERVA",
    orders: "PEDIDO",
    commands: "COMANDA",
    deliveries: "ENTREGA",
    cash: "CAJA",
    sales: "VENTA",
    expenses: "GASTO",
    inventory: "MOVIMIENTO_INVENTARIO",
    products: "PRODUCTO",
    catalog: "PRODUCTO",
  };

function isSensitiveKey(
  key: string,
): boolean {
  const normalizedKey =
    key.toUpperCase();

  return SENSITIVE_PARTS.some(
    (part) =>
      normalizedKey.includes(
        part,
      ),
  );
}

function sanitizeValue(
  value: unknown,
  depth = 0,
): Prisma.InputJsonValue {
  if (depth > 8) {
    return "[PROFUNDIDAD_LIMITADA]";
  }

    if (value === null) {
    return "[NULL]";
    }

    if (
    typeof value === "string" ||
    typeof value === "boolean"
    ) {
    return value;
    }

  if (
    typeof value === "number"
  ) {
    return Number.isFinite(value)
      ? value
      : String(value);
  }

  if (
    Array.isArray(value)
  ) {
    return value.map(
      (item) =>
        sanitizeValue(
          item,
          depth + 1,
        ),
    );
  }

  if (
    typeof value === "object"
  ) {
    const result:
      Record<
        string,
        Prisma.InputJsonValue
      > = {};

    for (
      const [
        key,
        item,
      ]
      of Object.entries(value)
    ) {
      result[key] =
        isSensitiveKey(key)
          ? "[PROTEGIDO]"
          : sanitizeValue(
              item,
              depth + 1,
            );
    }

    return result;
  }

  return String(value);
}

export function sanitizeAuditData(
  value: unknown,
): Prisma.InputJsonValue | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length ===
      0
  ) {
    return undefined;
  }

  return sanitizeValue(value);
}

export function isUuid(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    UUID_PATTERN.test(value)
  );
}

export function getAuditPathInformation(
  originalUrl: string,
) {
  const pathname =
    originalUrl
      .split("?")[0] ??
    "";

  const segments =
    pathname
      .split("/")
      .filter(Boolean);

  const apiIndex =
    segments.indexOf("api");

  const firstSegment =
    apiIndex >= 0
      ? segments[
          apiIndex + 1
        ] ?? ""
      : "";

  const moduleSegment =
    firstSegment === "admin"
      ? segments[
          apiIndex + 2
        ] ?? ""
      : firstSegment;

  const entityId =
    segments.find(
      (segment) =>
        isUuid(segment),
    ) ?? null;

  return {
    moduleSegment,

    modulo:
      MODULE_NAMES[
        moduleSegment
      ] ??
      moduleSegment
        .toUpperCase(),

    entidad:
      ENTITY_NAMES[
        moduleSegment
      ] ??
      moduleSegment
        .toUpperCase(),

    entidadId:
      entityId,
  };
}

export function getAuditAction(
  method: string,
  originalUrl: string,
): string {
  const normalizedUrl =
    originalUrl.toLowerCase();

  if (
    normalizedUrl.includes(
      "/void",
    )
  ) {
    return "ANULAR";
  }

  if (
    normalizedUrl.includes(
      "/cancel",
    )
  ) {
    return "CANCELAR";
  }

  if (
    normalizedUrl.includes(
      "/status",
    )
  ) {
    return "CAMBIAR_ESTADO";
  }

  if (
    normalizedUrl.includes(
      "/close",
    )
  ) {
    return "CERRAR";
  }

  if (
    normalizedUrl.includes(
      "/open",
    )
  ) {
    return "ABRIR";
  }

  if (
    normalizedUrl.includes(
      "/send",
    )
  ) {
    return "ENVIAR";
  }

  if (
    normalizedUrl.includes(
      "/start",
    )
  ) {
    return "INICIAR";
  }

  if (
    normalizedUrl.includes(
      "/complete",
    )
  ) {
    return "COMPLETAR";
  }

  if (
    normalizedUrl.includes(
      "/pickup",
    )
  ) {
    return "RETIRAR";
  }

  if (
    normalizedUrl.includes(
      "/editability",
    )
  ) {
    return "CAMBIAR_EDITABILIDAD";
  }

  if (method === "POST") {
    return "CREAR";
  }

  if (
    method === "PATCH" ||
    method === "PUT"
  ) {
    return "ACTUALIZAR";
  }

  if (method === "DELETE") {
    return "ELIMINAR";
  }

  return method;
}

export function createAuditDescription(
  action: string,
  entity: string,
): string {
  const descriptions:
    Record<string, string> = {
      CREAR:
        `Se creó un registro de ${entity}.`,

      ACTUALIZAR:
        `Se actualizaron los datos de ${entity}.`,

      ELIMINAR:
        `Se eliminó un registro de ${entity}.`,

      ANULAR:
        `Se anuló un registro de ${entity}.`,

      CANCELAR:
        `Se canceló un registro de ${entity}.`,

      CAMBIAR_ESTADO:
        `Se cambió el estado de ${entity}.`,

      CAMBIAR_EDITABILIDAD:
        `Se cambió la protección de ${entity}.`,

      ABRIR:
        `Se realizó la apertura de ${entity}.`,

      CERRAR:
        `Se realizó el cierre de ${entity}.`,

      ENVIAR:
        `Se envió un registro de ${entity}.`,

      INICIAR:
        `Se inició el procesamiento de ${entity}.`,

      COMPLETAR:
        `Se completó un registro de ${entity}.`,

      RETIRAR:
        `Se registró el retiro de ${entity}.`,
    };

  return (
    descriptions[action] ??
    `Se ejecutó la acción ${action} sobre ${entity}.`
  );
}