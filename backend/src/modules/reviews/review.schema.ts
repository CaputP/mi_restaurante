import { z } from "zod";

const uuid = z
  .string()
  .uuid("El identificador no es válido.");

export const reviewIdParamSchema =
  z.object({
    id: uuid,
  });

export const publicReviewQuerySchema =
  z.object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(12)
      .optional()
      .default(6),
  });

export const clientSaleReviewQuerySchema =
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
      .max(50)
      .optional()
      .default(12),
  });

export const createReviewSchema =
  z.object({
    ventaId: uuid,
    calificacion: z.coerce
      .number()
      .int()
      .min(1, "Selecciona al menos una estrella.")
      .max(5, "La calificación máxima es cinco estrellas."),
    comentario: z
      .string()
      .trim()
      .min(10, "El comentario debe tener al menos 10 caracteres.")
      .max(1000, "El comentario no puede superar los 1000 caracteres."),
    aceptaPublicacion: z.literal(true, {
      error:
        "Debes autorizar la publicación de tu opinión.",
    }),
  });

export const adminReviewListQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .max(200)
      .optional()
      .default(""),
    estado: z
      .enum([
        "TODOS",
        "PENDIENTE",
        "APROBADA",
        "RECHAZADA",
        "OCULTA",
      ])
      .optional()
      .default("PENDIENTE"),
    destacada: z
      .enum(["TODAS", "SI", "NO"])
      .optional()
      .default("TODAS"),
    sucursalId: z
      .union([uuid, z.literal("")])
      .optional()
      .transform((value) => value || undefined),
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

export const moderateReviewSchema =
  z.object({
    estado: z.enum([
      "APROBADA",
      "RECHAZADA",
      "OCULTA",
    ]),
    destacada: z
      .boolean()
      .optional()
      .default(false),
    motivo: z
      .union([
        z.string().trim().max(500),
        z.literal(""),
        z.null(),
      ])
      .optional()
      .transform((value) => value || null),
  })
  .superRefine((data, context) => {
    if (
      data.estado !== "APROBADA" &&
      !data.motivo
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivo"],
        message:
          "Indica el motivo para rechazar u ocultar la reseña.",
      });
    }

    if (
      data.estado !== "APROBADA" &&
      data.destacada
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destacada"],
        message:
          "Solo una reseña aprobada puede ser destacada.",
      });
    }
  });

export type PublicReviewQuery =
  z.infer<typeof publicReviewQuerySchema>;
export type ClientSaleReviewQuery =
  z.infer<typeof clientSaleReviewQuerySchema>;
export type CreateReviewInput =
  z.infer<typeof createReviewSchema>;
export type AdminReviewListQuery =
  z.infer<typeof adminReviewListQuerySchema>;
export type ModerateReviewInput =
  z.infer<typeof moderateReviewSchema>;
