import {
  z,
} from "zod";

export const notificationListQuerySchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .positive()
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    leida: z
      .enum([
        "true",
        "false",
      ])
      .optional()
      .transform(
        (value) =>
          value === undefined
            ? undefined
            : value === "true",
      ),

    tipo: z
      .enum([
        "STOCK_BAJO",
        "RESERVA_PENDIENTE",
        "RESERVA_CONFIRMADA",
        "RESERVA_ACTUALIZADA",
        "COMANDA_NUEVA",
        "PEDIDO_LISTO",
        "CAJA_ABIERTA",
        "CAJA_CERRADA",
        "CAJA_PENDIENTE_CIERRE",
        "PREMIO_DISPONIBLE",
        "RESENA_DISPONIBLE",
        "RESENA_PENDIENTE",
        "RESENA_MODERADA",
        "RESPALDO",
        "SISTEMA",
      ])
      .optional(),

    prioridad: z
      .enum([
        "BAJA",
        "NORMAL",
        "ALTA",
        "CRITICA",
      ])
      .optional(),
  });

export const notificationIdParamSchema =
  z.object({
    id: z
      .string()
      .uuid(
        "El identificador de la notificación no es válido.",
      ),
  });

export type NotificationListQuery =
  z.infer<
    typeof notificationListQuerySchema
  >;
