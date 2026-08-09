import { z } from "zod";

const uuidSchema = z
  .string()
  .uuid("El identificador no es válido.");

export const roleIdSchema = z.object({
  id: uuidSchema,
});

export const updateRolePermissionsSchema =
  z.object({
    permisoIds: z
      .array(uuidSchema)
      .max(
        100,
        "No se pueden asignar más de 100 permisos.",
      )
      .refine(
        (ids) =>
          new Set(ids).size ===
          ids.length,
        "No se permiten permisos repetidos.",
      ),
    password: z
      .string()
      .min(
        1,
        "Confirma tu contraseña.",
      )
      .max(200),
  });

export type UpdateRolePermissionsInput =
  z.infer<
    typeof updateRolePermissionsSchema
  >;
