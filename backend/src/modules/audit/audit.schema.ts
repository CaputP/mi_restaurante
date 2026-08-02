import { z } from "zod";

const uuidSchema = z
  .string()
  .uuid(
    "El identificador no es válido.",
  );

const optionalUuidSchema =
  z
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

const optionalDateSchema =
  z
    .union([
      dateSchema,
      z.literal(""),
    ])
    .optional()
    .transform((value) =>
      value || undefined,
    );

export const auditOptionsQuerySchema =
  z.object({
    sucursalId:
      optionalUuidSchema,
  });

export const listAuditsQuerySchema =
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

      usuarioId:
        optionalUuidSchema,

      modulo: z
        .string()
        .trim()
        .max(100)
        .optional(),

      accion: z
        .string()
        .trim()
        .max(100)
        .optional(),

      fechaDesde:
        optionalDateSchema,

      fechaHasta:
        optionalDateSchema,

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

export const auditIdSchema =
  z.object({
    id:
      uuidSchema,
  });

export type AuditOptionsQuery =
  z.infer<
    typeof auditOptionsQuerySchema
  >;

export type ListAuditsQuery =
  z.infer<
    typeof listAuditsQuerySchema
  >;