import { z } from "zod";

const uuidSchema = z
  .string()
  .uuid(
    "El identificador no es válido.",
  );

export const commandOptionsQuerySchema =
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

export const listCommandsQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .max(180)
      .optional()
      .default(""),

    sucursalId: z
      .union([
        uuidSchema,
        z.literal(""),
      ])
      .optional()
      .transform((value) =>
        value || undefined,
      ),

    destino: z
      .enum([
        "TODOS",
        "COCINA",
        "BARRA",
      ])
      .optional()
      .default("TODOS"),

    estado: z
      .enum([
        "ACTIVAS",
        "TODOS",
        "PENDIENTE",
        "PREPARANDO",
        "LISTA",
        "RECHAZADA",
        "CANCELADA",
      ])
      .optional()
      .default("ACTIVAS"),

    prioridad: z
      .enum([
        "TODAS",
        "NORMAL",
        "URGENTE",
        "EVENTO",
      ])
      .optional()
      .default("TODAS"),

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

export const commandIdSchema =
  z.object({
    id: uuidSchema,
  });

export type CommandOptionsQuery =
  z.infer<
    typeof commandOptionsQuerySchema
  >;

export type ListCommandsQuery =
  z.infer<
    typeof listCommandsQuerySchema
  >;