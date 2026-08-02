import { z } from "zod";

const uuidSchema = z
  .string()
  .uuid(
    "El identificador no es válido.",
  );

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

const nullableUuidSchema =
  z
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

const settingDataTypeSchema =
  z.enum([
    "TEXTO",
    "ENTERO",
    "DECIMAL",
    "BOOLEANO",
    "JSON",
    "FECHA",
    "HORA",
  ]);

const documentTypeSchema =
  z.enum([
    "RESERVA",
    "PEDIDO",
    "COMANDA",
    "TICKET",
    "CAJA",
    "GASTO",
  ]);

export const settingOptionsQuerySchema =
  z.object({
    sucursalId:
      optionalQueryUuidSchema,
  });

export const listSettingsQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .max(180)
      .optional()
      .default(""),

    sucursalId:
      optionalQueryUuidSchema,

    alcance: z
      .enum([
        "TODOS",
        "GLOBAL",
        "SUCURSAL",
      ])
      .optional()
      .default("TODOS"),

    tipoDato:
      settingDataTypeSchema
        .optional(),

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
  });

export const createSettingSchema =
  z.object({
    sucursalId:
      nullableUuidSchema,

    clave: z
      .string()
      .trim()
      .min(
        2,
        "La clave debe contener al menos 2 caracteres.",
      )
      .max(
        120,
        "La clave no puede superar los 120 caracteres.",
      )
      .regex(
        /^[A-Za-z0-9_.-]+$/,
        "La clave solo puede contener letras, números, puntos, guiones y guiones bajos.",
      )
      .transform((value) =>
        value.toUpperCase(),
      ),

    valor:
      z.unknown(),

    tipoDato:
      settingDataTypeSchema,

    descripcion:
      optionalText(1000),

    editable: z.coerce
      .boolean()
      .optional()
      .default(true),
  });

export const updateSettingSchema =
  z.object({
    valor:
      z.unknown(),

    descripcion:
      optionalText(1000),
  });

export const updateSettingEditabilitySchema =
  z.object({
    editable:
      z.boolean(),
  });

export const settingIdSchema =
  z.object({
    id:
      uuidSchema,
  });

export const listCorrelativesQuerySchema =
  z.object({
    sucursalId:
      uuidSchema,
  });

export const updateCorrelativeSchema =
  z.object({
    sucursalId:
      uuidSchema,

    prefijo: z
      .string()
      .trim()
      .min(
        1,
        "El prefijo es obligatorio.",
      )
      .max(
        15,
        "El prefijo no puede superar los 15 caracteres.",
      )
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "El prefijo solo puede contener letras, números y guiones.",
      )
      .transform((value) =>
        value.toUpperCase(),
      ),

    longitudNumero: z.coerce
      .number()
      .int()
      .min(
        3,
        "La longitud mínima es 3.",
      )
      .max(
        12,
        "La longitud máxima es 12.",
      ),
  });

export const correlativeDocumentTypeSchema =
  z.object({
    tipoDocumento:
      documentTypeSchema,
  });

export type SettingOptionsQuery =
  z.infer<
    typeof settingOptionsQuerySchema
  >;

export type ListSettingsQuery =
  z.infer<
    typeof listSettingsQuerySchema
  >;

export type CreateSettingInput =
  z.infer<
    typeof createSettingSchema
  >;

export type UpdateSettingInput =
  z.infer<
    typeof updateSettingSchema
  >;

export type UpdateSettingEditabilityInput =
  z.infer<
    typeof updateSettingEditabilitySchema
  >;

export type ListCorrelativesQuery =
  z.infer<
    typeof listCorrelativesQuerySchema
  >;

export type UpdateCorrelativeInput =
  z.infer<
    typeof updateCorrelativeSchema
  >;

export type CorrelativeDocumentType =
  z.infer<
    typeof documentTypeSchema
  >;