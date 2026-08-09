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

const dateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "La fecha debe tener el formato YYYY-MM-DD.",
  );

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

export const cashOptionsQuerySchema =
  z.object({
    sucursalId:
      optionalUuidSchema,
  });

export const currentCashQuerySchema =
  z.object({
    sucursalId:
      optionalUuidSchema,

    vendedorId:
      optionalUuidSchema,
  });

export const listCashRegistersQuerySchema =
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

      vendedorId:
        optionalUuidSchema,

      estado: z
        .enum([
          "TODOS",
          "ABIERTA",
          "CERRADA",
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

export const openCashRegisterSchema =
  z.object({
    sucursalId:
      uuidSchema,

    vendedorId:
      optionalUuidSchema,

    montoInicial:
      moneySchema,

    observaciones:
      optionalText(2000),
  });

export const closeCashRegisterSchema =
  z.object({
    efectivoContado:
      moneySchema,

    observaciones:
      optionalText(2000),
  });

export const reopenCashRegisterSchema =
  z.object({
    motivo: z
      .string()
      .trim()
      .min(
        10,
        "El motivo debe contener al menos 10 caracteres.",
      )
      .max(1000),

    password: z
      .string()
      .min(
        8,
        "La contraseña de confirmación es obligatoria.",
      )
      .max(200),
  });

export const cashRegisterIdSchema =
  z.object({
    id: uuidSchema,
  });

export type CashOptionsQuery =
  z.infer<
    typeof cashOptionsQuerySchema
  >;

export type CurrentCashQuery =
  z.infer<
    typeof currentCashQuerySchema
  >;

export type ListCashRegistersQuery =
  z.infer<
    typeof listCashRegistersQuerySchema
  >;

export type OpenCashRegisterInput =
  z.infer<
    typeof openCashRegisterSchema
  >;

export type CloseCashRegisterInput =
  z.infer<
    typeof closeCashRegisterSchema
  >;

export type ReopenCashRegisterInput =
  z.infer<
    typeof reopenCashRegisterSchema
  >;
