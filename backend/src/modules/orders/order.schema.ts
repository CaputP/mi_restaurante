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

const dateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "La fecha debe tener el formato YYYY-MM-DD.",
  )
  .refine(
    (value) => {
      const date = new Date(
        `${value}T00:00:00.000Z`,
      );

      return (
        !Number.isNaN(
          date.getTime(),
        ) &&
        date
          .toISOString()
          .slice(0, 10) === value
      );
    },
    {
      message:
        "La fecha ingresada no es válida.",
    },
  );

const orderDetailSchema =
  z.object({
    productoSucursalId:
      uuidSchema,

    cantidad: z.coerce
      .number()
      .finite()
      .positive(
        "La cantidad debe ser mayor que cero.",
      )
      .max(
        999999999.999,
        "La cantidad ingresada es demasiado alta.",
      ),

    observaciones:
      optionalText(500),
  });

export const updateOrderSchema =
  z
    .object({
      clienteId:
        optionalUuidSchema,

      mozoId:
        optionalUuidSchema,

      zonaId:
        optionalUuidSchema,

      tipoPedido: z.enum([
        "CONSUMO_LOCAL",
        "PARA_LLEVAR",
      ]),

      observaciones:
        optionalText(2000),

      detalles: z
        .array(
          orderDetailSchema,
        )
        .min(
          1,
          "El pedido debe contener al menos un producto.",
        )
        .max(
          100,
          "El pedido no puede contener más de 100 productos.",
        ),
    })
    .superRefine(
      (data, context) => {
        if (
          data.tipoPedido ===
            "CONSUMO_LOCAL" &&
          !data.zonaId
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "La zona es obligatoria para pedidos de consumo local.",

            path: ["zonaId"],
          });
        }

        if (
          data.tipoPedido ===
            "PARA_LLEVAR" &&
          data.zonaId
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "Un pedido para llevar no debe tener una zona asignada.",

            path: ["zonaId"],
          });
        }

        if (
          data.tipoPedido ===
            "PARA_LLEVAR" &&
          data.mozoId
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "Un pedido para llevar no debe tener un mozo asignado.",

            path: ["mozoId"],
          });
        }

        const productIds =
          data.detalles.map(
            (detail) =>
              detail
                .productoSucursalId,
          );

        if (
          new Set(productIds)
            .size !==
          productIds.length
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "Un producto no puede repetirse dentro del pedido.",

            path: ["detalles"],
          });
        }
      },
    );

export const sendOrderSchema =
  z.object({
    prioridad: z
      .enum([
        "NORMAL",
        "URGENTE",
        "EVENTO",
      ])
      .optional()
      .default("NORMAL"),
  });

export const orderOptionsQuerySchema =
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

export const listOrdersQuerySchema =
  z
    .object({
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

      vendedorId: z
        .union([
          uuidSchema,
          z.literal(""),
        ])
        .optional()
        .transform((value) =>
          value || undefined,
        ),

      mozoId: z
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
          "TODOS",
          "ABIERTO",
          "ENVIADO",
          "EN_PREPARACION",
          "LISTO",
          "ENTREGA_PARCIAL",
          "ENTREGADO",
          "PAGADO",
          "CANCELADO",
        ])
        .optional()
        .default("TODOS"),

      tipoPedido: z
        .enum([
          "TODOS",
          "CONSUMO_LOCAL",
          "PARA_LLEVAR",
          "RESERVA",
          "EVENTO",
        ])
        .optional()
        .default("TODOS"),

      fechaDesde: z
        .union([
          dateSchema,
          z.literal(""),
        ])
        .optional()
        .transform((value) =>
          value || undefined,
        ),

      fechaHasta: z
        .union([
          dateSchema,
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
    })
    .refine(
      (data) =>
        !data.fechaDesde ||
        !data.fechaHasta ||
        data.fechaDesde <=
          data.fechaHasta,
      {
        message:
          "La fecha inicial no puede ser posterior a la fecha final.",

        path: [
          "fechaHasta",
        ],
      },
    );

export const createOrderSchema =
  z
    .object({
      sucursalId:
        uuidSchema,

      clienteId:
        optionalUuidSchema,

      vendedorId:
        optionalUuidSchema,

      mozoId:
        optionalUuidSchema,

      zonaId:
        optionalUuidSchema,

      tipoPedido: z.enum([
        "CONSUMO_LOCAL",
        "PARA_LLEVAR",
      ]),

      observaciones:
        optionalText(2000),

      detalles: z
        .array(
          orderDetailSchema,
        )
        .min(
          1,
          "El pedido debe contener al menos un producto.",
        )
        .max(
          100,
          "El pedido no puede contener más de 100 productos.",
        ),
    })
    .superRefine(
      (data, context) => {
        if (
          data.tipoPedido ===
            "CONSUMO_LOCAL" &&
          !data.zonaId
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "La zona es obligatoria para pedidos de consumo local.",

            path: ["zonaId"],
          });
        }

        if (
          data.tipoPedido ===
            "PARA_LLEVAR" &&
          data.zonaId
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "Un pedido para llevar no debe tener una zona asignada.",

            path: ["zonaId"],
          });
        }

        if (
          data.tipoPedido ===
            "PARA_LLEVAR" &&
          data.mozoId
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "Un pedido para llevar no debe tener un mozo asignado.",

            path: ["mozoId"],
          });
        }

        const productIds =
          data.detalles.map(
            (detail) =>
              detail
                .productoSucursalId,
          );

        if (
          new Set(productIds)
            .size !==
          productIds.length
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "Un producto no puede repetirse dentro del pedido.",

            path: ["detalles"],
          });
        }
      },
    );

export const orderIdSchema =
  z.object({
    id: uuidSchema,
  });

export type OrderOptionsQuery =
  z.infer<
    typeof orderOptionsQuerySchema
  >;

export type ListOrdersQuery =
  z.infer<
    typeof listOrdersQuerySchema
  >;

export type CreateOrderInput =
  z.infer<
    typeof createOrderSchema
  >;

export type UpdateOrderInput =
  z.infer<
    typeof updateOrderSchema
  >;

export type SendOrderInput =
  z.infer<
    typeof sendOrderSchema
  >;