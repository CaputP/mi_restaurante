import { z } from "zod";

const uuidSchema = z
  .string()
  .uuid(
    "El identificador no es válido.",
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

const branchStateSchema =
  z.enum([
    "ACTIVO",
    "INACTIVO",
    "ARCHIVADO",
  ]);

export const listBranchesQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .max(180)
      .optional()
      .default(""),

    estado: z
      .enum([
        "TODOS",
        "ACTIVO",
        "INACTIVO",
        "ARCHIVADO",
      ])
      .optional()
      .default("TODOS"),

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

export const createBranchSchema =
  z.object({
    codigo: z
      .string()
      .trim()
      .min(
        2,
        "El código debe contener al menos 2 caracteres.",
      )
      .max(
        20,
        "El código no puede superar los 20 caracteres.",
      )
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "El código solo puede contener letras, números, guiones y guiones bajos.",
      )
      .transform((value) =>
        value.toUpperCase(),
      ),

    nombre: z
      .string()
      .trim()
      .min(
        3,
        "El nombre debe contener al menos 3 caracteres.",
      )
      .max(
        150,
        "El nombre no puede superar los 150 caracteres.",
      ),

    razonSocial:
      optionalText(200),

    ruc: z
      .union([
        z
          .string()
          .trim()
          .regex(
            /^\d{11}$/,
            "El RUC debe contener exactamente 11 dígitos.",
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
      }),

    direccion: z
      .string()
      .trim()
      .min(
        5,
        "La dirección debe contener al menos 5 caracteres.",
      )
      .max(
        250,
        "La dirección no puede superar los 250 caracteres.",
      ),

    telefono:
      optionalText(30),

    correo: z
      .union([
        z
          .string()
          .trim()
          .email(
            "El correo electrónico no es válido.",
          )
          .max(160)
          .transform((value) =>
            value.toLowerCase(),
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
      }),

    zonaHoraria: z
      .string()
      .trim()
      .min(3)
      .max(60)
      .optional()
      .default(
        "America/Lima",
      ),

    estado:
      branchStateSchema
        .optional()
        .default(
          "ACTIVO",
        ),
  });

export const updateBranchSchema =
  createBranchSchema
    .omit({
      codigo: true,
      estado: true,
    })
    .partial();

export const updateBranchStateSchema =
  z.object({
    estado:
      branchStateSchema,
  });

export const createZoneSchema =
  z.object({
    nombre: z
      .string()
      .trim()
      .min(
        2,
        "El nombre debe contener al menos 2 caracteres.",
      )
      .max(
        120,
        "El nombre no puede superar los 120 caracteres.",
      ),

    descripcion:
      optionalText(1000),

    capacidadReferencial: z
      .union([
        z.coerce
          .number()
          .int()
          .positive(
            "La capacidad debe ser mayor que cero.",
          )
          .max(
            10000,
            "La capacidad ingresada es demasiado alta.",
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
      }),

    estado:
      branchStateSchema
        .optional()
        .default(
          "ACTIVO",
        ),
  });

export const updateZoneSchema =
  createZoneSchema
    .omit({
      estado: true,
    })
    .partial();

export const updateZoneStateSchema =
  z.object({
    estado:
      branchStateSchema,
  });

export const branchIdSchema =
  z.object({
    id:
      uuidSchema,
  });

export const branchZoneIdSchema =
  z.object({
    id:
      uuidSchema,

    zoneId:
      uuidSchema,
  });

export const zoneIdSchema =
  z.object({
    zoneId:
      uuidSchema,
  });

export type ListBranchesQuery =
  z.infer<
    typeof listBranchesQuerySchema
  >;

export type CreateBranchInput =
  z.infer<
    typeof createBranchSchema
  >;

export type UpdateBranchInput =
  z.infer<
    typeof updateBranchSchema
  >;

export type UpdateBranchStateInput =
  z.infer<
    typeof updateBranchStateSchema
  >;

export type CreateZoneInput =
  z.infer<
    typeof createZoneSchema
  >;

export type UpdateZoneInput =
  z.infer<
    typeof updateZoneSchema
  >;

export type UpdateZoneStateInput =
  z.infer<
    typeof updateZoneStateSchema
  >;