import { z } from "zod";

const uuidSchema = z
  .string()
  .uuid("El identificador no es válido.");

const quantitySchema = z.coerce
  .number()
  .finite()
  .positive(
    "La cantidad debe ser mayor que cero.",
  )
  .max(
    999999999.999,
    "La cantidad ingresada es demasiado alta.",
  );

const optionalCostSchema = z.preprocess(
  (value) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return undefined;
    }

    return value;
  },
  z.coerce
    .number()
    .finite()
    .min(
      0,
      "El costo unitario no puede ser negativo.",
    )
    .max(
      999999999.99,
      "El costo unitario es demasiado alto.",
    )
    .optional(),
);

const manualMovementTypeSchema = z.enum([
  "ENTRADA_COMPRA",
  "AJUSTE_ENTRADA",
  "AJUSTE_SALIDA",
  "PERDIDA",
  "VENCIMIENTO",
  "CONSUMO_INTERNO",
]);

const allMovementTypeSchema = z.enum([
  "ENTRADA_COMPRA",
  "AJUSTE_ENTRADA",
  "AJUSTE_SALIDA",
  "PERDIDA",
  "VENCIMIENTO",
  "VENTA",
  "ANULACION_VENTA",
  "COMPROMISO_RESERVA",
  "LIBERACION_RESERVA",
  "CONSUMO_INTERNO",
]);

export const listInventoryQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .max(150)
      .optional()
      .default(""),

    sucursalId: z
      .union([
        uuidSchema,
        z.literal(""),
      ])
      .optional()
      .transform((value) =>
        value || undefined,
      ),

    tipoStock: z
      .enum([
        "TODOS",
        "DIARIO",
        "PERMANENTE",
      ])
      .optional()
      .default("TODOS"),

    soloAlertas: z
      .enum([
        "true",
        "false",
      ])
      .optional()
      .default("false")
      .transform(
        (value) => value === "true",
      ),
  });

export const createDailyStockSchema =
  z.object({
    productoSucursalId:
      uuidSchema,

    cantidadInicial: z.coerce
      .number()
      .finite()
      .min(
        0,
        "La cantidad inicial no puede ser negativa.",
      )
      .max(
        999999999.999,
        "La cantidad ingresada es demasiado alta.",
      ),

    motivo: z
      .string()
      .trim()
      .min(
        3,
        "El motivo debe tener al menos 3 caracteres.",
      )
      .max(
        500,
        "El motivo no puede superar los 500 caracteres.",
      )
      .optional()
      .default(
        "Apertura de stock diario",
      ),
  });

export const createInventoryMovementSchema =
  z.object({
    productoSucursalId:
      uuidSchema,

    tipoMovimiento:
      manualMovementTypeSchema,

    cantidad: quantitySchema,

    costoUnitario:
      optionalCostSchema,

    motivo: z
      .string()
      .trim()
      .min(
        3,
        "El motivo debe tener al menos 3 caracteres.",
      )
      .max(
        1000,
        "El motivo no puede superar los 1000 caracteres.",
      ),
  });

export const listMovementsQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .max(150)
      .optional()
      .default(""),

    sucursalId: z
      .union([
        uuidSchema,
        z.literal(""),
      ])
      .optional()
      .transform((value) =>
        value || undefined,
      ),

    productoSucursalId: z
      .union([
        uuidSchema,
        z.literal(""),
      ])
      .optional()
      .transform((value) =>
        value || undefined,
      ),

    tipoMovimiento: z
      .union([
        allMovementTypeSchema,
        z.literal("TODOS"),
      ])
      .optional()
      .default("TODOS"),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(50),
  });

export type ListInventoryQuery =
  z.infer<
    typeof listInventoryQuerySchema
  >;

export type CreateDailyStockInput =
  z.infer<
    typeof createDailyStockSchema
  >;

export type CreateInventoryMovementInput =
  z.infer<
    typeof createInventoryMovementSchema
  >;

export type ListMovementsQuery =
  z.infer<
    typeof listMovementsQuerySchema
  >;