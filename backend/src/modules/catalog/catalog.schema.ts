import { z } from "zod";

const categoryNameSchema = z
  .string()
  .trim()
  .min(
    2,
    "El nombre debe tener al menos 2 caracteres.",
  )
  .max(
    120,
    "El nombre no puede superar los 120 caracteres.",
  )
  .transform((value) =>
    value.replace(/\s+/g, " "),
  );

const categoryDescriptionSchema = z
  .union([
    z
      .string()
      .trim()
      .max(
        1000,
        "La descripción no puede superar los 1000 caracteres.",
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

export const listCategoriesQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .max(120)
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
  });

export const createCategorySchema = z.object({
  nombre: categoryNameSchema,
  descripcion: categoryDescriptionSchema,
});

export const updateCategorySchema = z.object({
  nombre: categoryNameSchema,
  descripcion: categoryDescriptionSchema,
});

export const updateCategoryStatusSchema =
  z.object({
    estado: z.enum([
      "ACTIVO",
      "INACTIVO",
    ]),
  });

export const categoryIdSchema = z.object({
  id: z
    .string()
    .uuid(
      "El identificador de la categoría no es válido.",
    ),
});

export type ListCategoriesQuery =
  z.infer<
    typeof listCategoriesQuerySchema
  >;

export type CreateCategoryInput =
  z.infer<
    typeof createCategorySchema
  >;

export type UpdateCategoryInput =
  z.infer<
    typeof updateCategorySchema
  >;

export type UpdateCategoryStatusInput =
  z.infer<
    typeof updateCategoryStatusSchema
  >;