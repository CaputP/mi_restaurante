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

const optionalQueryUuidSchema =
  z
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
  .positive(
    "El monto debe ser mayor que cero.",
  )
  .max(
    999999999.99,
    "El monto ingresado es demasiado alto.",
  );

export const expenseOptionsQuerySchema =
  z.object({
    sucursalId:
      optionalQueryUuidSchema,
  });

export const listExpensesQuerySchema =
  z
    .object({
      search: z
        .string()
        .trim()
        .max(180)
        .optional()
        .default(""),

      sucursalId:
        optionalQueryUuidSchema,

      categoriaGastoId:
        optionalQueryUuidSchema,

      cajaId:
        optionalQueryUuidSchema,

      metodoPago: z
        .enum([
          "EFECTIVO",
          "YAPE",
          "PLIN",
          "TARJETA",
          "TRANSFERENCIA",
        ])
        .optional(),

      estado: z
        .enum([
          "TODOS",
          "REGISTRADO",
          "ANULADO",
        ])
        .optional()
        .default("TODOS"),

      salioDeCaja: z
        .enum([
          "TODOS",
          "SI",
          "NO",
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

        path: ["fechaHasta"],
      },
    );

export const createExpenseSchema =
  z
    .object({
      sucursalId:
        uuidSchema,

      categoriaGastoId:
        uuidSchema,

      cajaId:
        optionalUuidSchema,

      descripcion: z
        .string()
        .trim()
        .min(
          3,
          "La descripción debe contener al menos 3 caracteres.",
        )
        .max(
          2000,
          "La descripción no puede superar los 2000 caracteres.",
        ),

      monto:
        moneySchema,

      metodoPago: z.enum([
        "EFECTIVO",
        "YAPE",
        "PLIN",
        "TARJETA",
        "TRANSFERENCIA",
      ]),

      salioDeCaja: z.coerce
        .boolean()
        .optional()
        .default(false),

      comprobanteUrl:
        optionalText(500),

      fechaGasto: z
        .union([
          dateSchema,
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
        }),
    })
    .superRefine(
      (data, context) => {
        if (
          data.salioDeCaja &&
          !data.cajaId
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "Selecciona la caja de donde salió el dinero.",

            path: ["cajaId"],
          });
        }

        if (
          data.salioDeCaja &&
          data.metodoPago !==
            "EFECTIVO"
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "Un gasto retirado de caja debe registrarse en efectivo.",

            path: [
              "metodoPago",
            ],
          });
        }

        if (
          !data.salioDeCaja &&
          data.cajaId
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "No selecciones una caja cuando el gasto no salió de ella.",

            path: ["cajaId"],
          });
        }
      },
    );

export const createExpenseCategorySchema =
  z.object({
    nombre: z
      .string()
      .trim()
      .min(
        2,
        "El nombre debe contener al menos 2 caracteres.",
      )
      .max(
        100,
        "El nombre no puede superar los 100 caracteres.",
      ),

    descripcion:
      optionalText(1000),
  });

export const voidExpenseSchema =
  z.object({
    motivo: z
      .string()
      .trim()
      .min(
        5,
        "El motivo debe contener al menos 5 caracteres.",
      )
      .max(
        1000,
        "El motivo no puede superar los 1000 caracteres.",
      ),
  });

export const expenseIdSchema =
  z.object({
    id: uuidSchema,
  });

export type ExpenseOptionsQuery =
  z.infer<
    typeof expenseOptionsQuerySchema
  >;

export type ListExpensesQuery =
  z.infer<
    typeof listExpensesQuerySchema
  >;

export type CreateExpenseInput =
  z.infer<
    typeof createExpenseSchema
  >;

export type CreateExpenseCategoryInput =
  z.infer<
    typeof createExpenseCategorySchema
  >;

export type VoidExpenseInput =
  z.infer<
    typeof voidExpenseSchema
  >;