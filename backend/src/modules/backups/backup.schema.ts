import { z } from "zod";

export const listBackupsQuerySchema =
  z.object({
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

    estado: z
      .enum([
        "TODOS",
        "PENDIENTE",
        "EN_PROCESO",
        "COMPLETADO",
        "FALLIDO",
      ])
      .optional()
      .default("TODOS"),
  });

export const requestBackupSchema =
  z.object({
    password: z
      .string()
      .min(
        8,
        "La contraseña de confirmación es obligatoria.",
      )
      .max(200),
  });

export type ListBackupsQuery =
  z.infer<
    typeof listBackupsQuerySchema
  >;
