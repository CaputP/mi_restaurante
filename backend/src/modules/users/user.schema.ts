import { z } from "zod";

const uuidSchema = z
  .string()
  .uuid("El identificador no es válido.");

const nameSchema = z
  .string()
  .trim()
  .min(
    2,
    "El campo debe tener al menos 2 caracteres.",
  )
  .max(
    150,
    "El campo es demasiado largo.",
  )
  .transform((value) =>
    value.replace(/\s+/g, " "),
  );

const phoneSchema = z
  .union([
    z
      .string()
      .trim()
      .min(
        7,
        "El teléfono no es válido.",
      )
      .max(
        30,
        "El teléfono no es válido.",
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

const passwordSchema = z
  .string()
  .min(
    10,
    "La contraseña debe tener al menos 10 caracteres.",
  )
  .max(
    200,
    "La contraseña es demasiado larga.",
  )
  .regex(
    /[a-z]/,
    "La contraseña debe contener una letra minúscula.",
  )
  .regex(
    /[A-Z]/,
    "La contraseña debe contener una letra mayúscula.",
  )
  .regex(
    /\d/,
    "La contraseña debe contener un número.",
  );

const branchIdsSchema = z
  .array(uuidSchema)
  .max(
    50,
    "Se enviaron demasiadas sucursales.",
  )
  .optional()
  .default([])
  .refine(
    (branchIds) =>
      new Set(branchIds).size ===
      branchIds.length,
    {
      message:
        "Una sucursal no puede aparecer más de una vez.",
    },
  );

export const listUsersQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .max(160)
      .optional()
      .default(""),

    estado: z
      .enum([
        "TODOS",
        "ACTIVO",
        "INACTIVO",
        "BLOQUEADO",
        "ARCHIVADO",
      ])
      .optional()
      .default("TODOS"),

    rolId: z
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

export const createUserSchema = z
  .object({
    nombres: nameSchema,

    apellidos: nameSchema,

    telefono: phoneSchema,

    correo: z
      .string()
      .trim()
      .toLowerCase()
      .email(
        "El correo electrónico no es válido.",
      )
      .max(160),

    password: passwordSchema,

    confirmarPassword:
      z.string(),

    rolId: uuidSchema,

    sucursalIds:
      branchIdsSchema,
  })
  .refine(
    (data) =>
      data.password ===
      data.confirmarPassword,
    {
      message:
        "Las contraseñas no coinciden.",
      path: [
        "confirmarPassword",
      ],
    },
  );

export const updateUserSchema =
  z.object({
    nombres: nameSchema,

    apellidos: nameSchema,

    telefono: phoneSchema,

    rolId: uuidSchema,

    sucursalIds:
      branchIdsSchema,
  });

export const updateUserStatusSchema =
  z.object({
    estado: z.enum([
      "ACTIVO",
      "INACTIVO",
      "BLOQUEADO",
    ]),
  });

export const resetUserPasswordSchema =
  z
    .object({
      password: passwordSchema,

      confirmarPassword:
        z.string(),
    })
    .refine(
      (data) =>
        data.password ===
        data.confirmarPassword,
      {
        message:
          "Las contraseñas no coinciden.",
        path: [
          "confirmarPassword",
        ],
      },
    );

export const userIdSchema = z.object({
  id: uuidSchema,
});

export type ListUsersQuery =
  z.infer<
    typeof listUsersQuerySchema
  >;

export type CreateUserInput =
  z.infer<
    typeof createUserSchema
  >;

export type UpdateUserInput =
  z.infer<
    typeof updateUserSchema
  >;

export type UpdateUserStatusInput =
  z.infer<
    typeof updateUserStatusSchema
  >;

export type ResetUserPasswordInput =
  z.infer<
    typeof resetUserPasswordSchema
  >;