import { z } from "zod";

const uuidSchema = z
  .string()
  .uuid(
    "El identificador no es válido.",
  );

const optionalUuidSchema = z
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

export const deliveryOptionsQuerySchema =
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

export const readyOrdersQuerySchema =
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

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(50),
  });

export const listDeliveriesQuerySchema =
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

    estado: z
      .enum([
        "ACTIVAS",
        "TODOS",
        "PENDIENTE",
        "RETIRADA",
        "ENTREGADA",
        "ANULADA",
      ])
      .optional()
      .default("ACTIVAS"),

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

const deliveryDetailSchema =
  z.object({
    detallePedidoId:
      uuidSchema,

    cantidadEntregada:
      z.coerce
        .number()
        .finite()
        .positive(
          "La cantidad debe ser mayor que cero.",
        )
        .max(
          999999999.999,
          "La cantidad es demasiado alta.",
        ),
  });

export const createDeliverySchema =
  z
    .object({
      mozoId:
        optionalUuidSchema,

      observaciones:
        optionalText(2000),

      detalles: z
        .array(
          deliveryDetailSchema,
        )
        .min(
          1,
          "La entrega debe incluir al menos un producto.",
        )
        .max(
          100,
          "La entrega no puede incluir más de 100 productos.",
        ),
    })
    .superRefine(
      (data, context) => {
        const detailIds =
          data.detalles.map(
            (detail) =>
              detail
                .detallePedidoId,
          );

        if (
          new Set(detailIds)
            .size !==
          detailIds.length
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "Un detalle del pedido no puede repetirse.",

            path: ["detalles"],
          });
        }
      },
    );

export const deliveryIdSchema =
  z.object({
    id: uuidSchema,
  });

export const deliveryOrderIdSchema =
  z.object({
    orderId:
      uuidSchema,
  });

export type DeliveryOptionsQuery =
  z.infer<
    typeof deliveryOptionsQuerySchema
  >;

export type ReadyOrdersQuery =
  z.infer<
    typeof readyOrdersQuerySchema
  >;

export type ListDeliveriesQuery =
  z.infer<
    typeof listDeliveriesQuerySchema
  >;

export type CreateDeliveryInput =
  z.infer<
    typeof createDeliverySchema
  >;