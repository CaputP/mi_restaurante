import { z } from "zod";

const uuidSchema = z
  .string()
  .uuid("El identificador no es válido.");

const optionalDescriptionSchema = z
  .union([
    z
      .string()
      .trim()
      .max(
        2000,
        "La descripción no puede superar los 2000 caracteres.",
      ),
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

const branchConfigurationSchema = z.object({
  sucursalId: uuidSchema,

  precioVenta: z.coerce
    .number()
    .finite()
    .positive(
      "El precio de venta debe ser mayor que cero.",
    )
    .max(
      999999999.99,
      "El precio de venta es demasiado alto.",
    ),

  stockMinimo: z.coerce
    .number()
    .finite()
    .min(
      0,
      "El stock mínimo no puede ser negativo.",
    )
    .max(
      999999999.999,
      "El stock mínimo es demasiado alto.",
    )
    .default(0),

  disponibleVenta: z
    .boolean()
    .default(true),
});

const productBaseSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(
        2,
        "El código debe tener al menos 2 caracteres.",
      )
      .max(
        40,
        "El código no puede superar los 40 caracteres.",
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
        2,
        "El nombre debe tener al menos 2 caracteres.",
      )
      .max(
        150,
        "El nombre no puede superar los 150 caracteres.",
      )
      .transform((value) =>
        value.replace(/\s+/g, " "),
      ),

    descripcion:
      optionalDescriptionSchema,

    categoriaId: uuidSchema,

    unidadMedidaId: uuidSchema,

    tipoStock: z.enum([
      "DIARIO",
      "PERMANENTE",
      "SIN_CONTROL",
    ]),

    requierePreparacion:
      z.boolean().default(false),

    destinoPreparacion: z.enum([
      "COCINA",
      "BARRA",
      "NINGUNO",
    ]),

    permiteCortesia:
      z.boolean().default(false),

    sucursales: z
      .array(branchConfigurationSchema)
      .min(
        1,
        "Debes configurar al menos una sucursal.",
      )
      .max(
        50,
        "Se enviaron demasiadas sucursales.",
      ),
  })
  .superRefine((data, context) => {
    const branchIds =
      data.sucursales.map(
        (branch) => branch.sucursalId,
      );

    const uniqueBranchIds =
      new Set(branchIds);

    if (
      uniqueBranchIds.size !==
      branchIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["sucursales"],
        message:
          "Una sucursal no puede aparecer más de una vez.",
      });
    }

    if (
      data.requierePreparacion &&
      data.destinoPreparacion ===
        "NINGUNO"
    ) {
      context.addIssue({
        code: "custom",
        path: ["destinoPreparacion"],
        message:
          "Selecciona cocina o barra para un producto que requiere preparación.",
      });
    }

    if (
      !data.requierePreparacion &&
      data.destinoPreparacion !==
        "NINGUNO"
    ) {
      context.addIssue({
        code: "custom",
        path: ["destinoPreparacion"],
        message:
          "Un producto sin preparación debe tener destino NINGUNO.",
      });
    }
  });

export const listProductsQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .max(150)
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

    categoriaId: z
      .union([
        uuidSchema,
        z.literal(""),
      ])
      .optional()
      .transform((value) =>
        value || undefined,
      ),

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

export const createProductSchema =
  productBaseSchema;

export const updateProductSchema =
  productBaseSchema;

export const productIdSchema =
  z.object({
    id: uuidSchema,
  });

export const updateProductStatusSchema =
  z.object({
    estado: z.enum([
      "ACTIVO",
      "INACTIVO",
    ]),
  });

export type CreateProductInput =
  z.infer<
    typeof createProductSchema
  >;

export type UpdateProductInput =
  z.infer<
    typeof updateProductSchema
  >;

export type ListProductsQuery =
  z.infer<
    typeof listProductsQuerySchema
  >;

export type UpdateProductStatusInput =
  z.infer<
    typeof updateProductStatusSchema
  >;