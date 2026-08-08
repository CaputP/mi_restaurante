import { z } from "zod";

const uuidSchema = z
  .string()
  .uuid(
    "El identificador no es válido.",
  );
const optionalUuidSchema = z
  .union([
    uuidSchema,
    z.literal(""),
  ])
  .optional()
  .transform((value) =>
    value || undefined,
  );

const dateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "La fecha debe tener el formato YYYY-MM-DD.",
  );
const optionalText = (
  maximumLength: number,
) =>
  z
    .union([
      z
        .string()
        .trim()
        .max(
          maximumLength,
          `El texto no puede superar los ${maximumLength} caracteres.`,
        ),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((value) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return null;
      }

      return value;
    });

const moneySchema = z.coerce
  .number()
  .finite(
    "El monto no es válido.",
  )
  .min(
    0,
    "El monto no puede ser negativo.",
  )
  .max(
    999999999.99,
    "El monto ingresado es demasiado alto.",
  );

const optionalMoneySchema = z
  .union([
    moneySchema,
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((value) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return null;
    }

    return value;
  });

const paymentSchema = z
  .object({
    metodoPago: z.enum([
      "EFECTIVO",
      "YAPE",
      "PLIN",
      "TARJETA",
      "TRANSFERENCIA",
    ]),

    monto: moneySchema.refine(
      (value) => value > 0,
      {
        message:
          "El monto del pago debe ser mayor que cero.",
      },
    ),

    numeroOperacion:
      optionalText(100),

    montoRecibido:
      optionalMoneySchema,
  })
  .superRefine(
    (payment, context) => {
      if (
        payment.metodoPago !==
        "EFECTIVO" &&
        !payment.numeroOperacion
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          message:
            "El número de operación es obligatorio para pagos electrónicos.",

          path: [
            "numeroOperacion",
          ],
        });
      }

      if (
        payment.metodoPago ===
        "EFECTIVO" &&
        payment.montoRecibido !==
        null &&
        payment.montoRecibido <
        payment.monto
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          message:
            "El monto recibido no puede ser menor que el monto aplicado.",

          path: [
            "montoRecibido",
          ],
        });
      }

      if (
        payment.metodoPago !==
        "EFECTIVO" &&
        payment.montoRecibido !==
        null
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          message:
            "El monto recibido solamente corresponde a pagos en efectivo.",

          path: [
            "montoRecibido",
          ],
        });
      }
    },
  );

export const saleOptionsQuerySchema =
  z.object({
    sucursalId: z
      .union([
        uuidSchema,
        z.literal(""),
      ])
      .optional()
      .transform((value) =>
        value || undefined,
      ),
  });

export const createSaleSchema = z
  .object({
    pedidoId:
      uuidSchema,

    cajaId:
      uuidSchema,

    nombreCliente:
      optionalText(200),

    descuento:
      moneySchema
        .optional()
        .default(0),

    propina:
      moneySchema
        .optional()
        .default(0),

    observaciones:
      optionalText(2000),

    premioIds: z
      .array(
        uuidSchema,
      )
      .max(
        10,
        "No pueden canjearse más de 10 premios en una venta.",
      )
      .optional()
      .default([])
      .transform(
        (values) => [
          ...new Set(
            values,
          ),
        ],
      ),

    pagos: z
      .array(
        paymentSchema,
      )
      .max(
        10,
        "La venta no puede contener más de 10 pagos.",
      )
      .optional()
      .default([]),
  })
  .superRefine(
    (data, context) => {
      const operationNumbers =
        data.pagos
          .map(
            (payment) =>
              payment
                .numeroOperacion,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          );

      if (
        new Set(
          operationNumbers,
        ).size !==
        operationNumbers.length
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          message:
            "No puede repetirse un número de operación dentro de la venta.",

          path: ["pagos"],
        });
      }
    },
  );

export const listSalesQuerySchema =
  z
    .object({
      search: z
        .string()
        .trim()
        .max(180)
        .optional()
        .default(""),

      sucursalId:
        optionalUuidSchema,

      cajaId:
        optionalUuidSchema,

      estado: z
        .enum([
          "TODOS",
          "CONFIRMADA",
          "ANULADA",
        ])
        .optional()
        .default("TODOS"),

      fechaDesde: z
        .union([
          dateSchema,
          z.literal(""),
        ])
        .optional()
        .transform((value) =>
          value || undefined,
        ),

      fechaHasta: z
        .union([
          dateSchema,
          z.literal(""),
        ])
        .optional()
        .transform((value) =>
          value || undefined,
        ),

      page: z.coerce
        .number()
        .int()
        .min(1)
        .optional()
        .default(1),

      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(20),
    })
    .refine(
      (data) =>
        !data.fechaDesde ||
        !data.fechaHasta ||
        data.fechaDesde <=
        data.fechaHasta,
      {
        message:
          "La fecha inicial no puede ser posterior a la fecha final.",

        path: [
          "fechaHasta",
        ],
      },
    );

export const saleIdSchema =
  z.object({
    id: uuidSchema,
  });

export type SaleOptionsQuery =
  z.infer<
    typeof saleOptionsQuerySchema
  >;

export type CreateSaleInput =
  z.infer<
    typeof createSaleSchema
  >;

export type ListSalesQuery =
  z.infer<
    typeof listSalesQuerySchema
  >;