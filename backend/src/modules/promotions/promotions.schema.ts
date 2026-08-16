import { z } from "zod";

const uuidSchema =
  z.string().uuid(
    "El identificador no es válido.",
  );

const nullableUuidSchema =
  z.union([
    uuidSchema,
    z.literal(""),
    z.null(),
  ]).transform((value) =>
    value === "" ? null : value,
  );

const promotionTypeSchema =
  z.enum([
    "DESCUENTO_FIJO",
    "DESCUENTO_PORCENTAJE",
    "PRODUCTO_GRATIS",
    "COMBO",
  ]);

const promotionStatusSchema =
  z.enum([
    "BORRADOR",
    "ACTIVA",
    "PAUSADA",
    "FINALIZADA",
    "ARCHIVADA",
  ]);

const productIdsSchema =
  z.array(
    uuidSchema,
  )
    .max(
      100,
      "No puedes asociar más de 100 productos.",
    )
    .default([])
    .transform(
      (values) => [
        ...new Set(values),
      ],
    );

const promotionDataSchema =
  z.object({
    sucursalId:
      nullableUuidSchema,

    nombre: z
      .string()
      .trim()
      .min(
        3,
        "El nombre debe contener al menos 3 caracteres.",
      )
      .max(
        160,
        "El nombre no puede superar los 160 caracteres.",
      ),

    descripcion: z
      .string()
      .trim()
      .max(
        2000,
        "La descripción no puede superar los 2000 caracteres.",
      )
      .nullable()
      .optional(),

    tipo:
      promotionTypeSchema,

    valor: z
      .number()
      .positive(
        "El valor debe ser mayor a cero.",
      )
      .max(
        1000000,
        "El valor de la promoción es demasiado alto.",
      ),

    consumoMinimo: z
      .number()
      .min(
        0,
        "El consumo mínimo no puede ser negativo.",
      )
      .max(
        1000000,
        "El consumo mínimo es demasiado alto.",
      ),

    automatica:
      z.boolean(),

    acumulable:
      z.boolean(),

    maximoUsos: z
      .number()
      .int()
      .positive(
        "El máximo de usos debe ser mayor a cero.",
      )
      .max(
        10000000,
        "El máximo de usos es demasiado alto.",
      )
      .nullable(),

    fechaInicio: z
      .string()
      .datetime({
        offset:
          true,
      }),

    fechaFin: z
      .string()
      .datetime({
        offset:
          true,
      }),

    estado:
      promotionStatusSchema,

    productoIds:
      productIdsSchema,
  })
  .superRefine(
    (
      data,
      context,
    ) => {
      const startDate =
        new Date(
          data.fechaInicio,
        );

      const endDate =
        new Date(
          data.fechaFin,
        );

      if (
        endDate <=
        startDate
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "fechaFin",
          ],

          message:
            "La fecha final debe ser posterior a la fecha inicial.",
        });
      }

      if (
        data.tipo ===
          "DESCUENTO_PORCENTAJE" &&
        data.valor > 100
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "valor",
          ],

          message:
            "El descuento porcentual no puede superar el 100 %.",
        });
      }

      if (
        data.tipo ===
          "PRODUCTO_GRATIS" &&
        !Number.isInteger(
          data.valor,
        )
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "valor",
          ],

          message:
            "La cantidad de productos gratis debe ser un número entero.",
        });
      }

      if (
        (
          data.tipo ===
            "PRODUCTO_GRATIS" ||
          data.tipo ===
            "COMBO"
        ) &&
        data.productoIds
          .length === 0
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "productoIds",
          ],

          message:
            "Debes seleccionar al menos un producto.",
        });
      }
    },
  );

export const promotionOptionsQuerySchema =
  z.object({
    sucursalId:
      nullableUuidSchema
        .optional(),
  });

export const promotionParamsSchema =
  z.object({
    id:
      uuidSchema,
  });

export const promotionListQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .optional()
      .default(""),

    sucursalId:
      nullableUuidSchema
        .optional(),

    tipo:
      promotionTypeSchema
        .optional(),

    estado:
      z.union([
        promotionStatusSchema,
        z.literal(
          "TODOS",
        ),
      ])
        .optional()
        .default(
          "TODOS",
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

export const createPromotionSchema =
  promotionDataSchema;

export const updatePromotionSchema =
  promotionDataSchema;

export const updatePromotionStatusSchema =
  z.object({
    estado:
      promotionStatusSchema,
  });

export type PromotionListQuery =
  z.infer<
    typeof promotionListQuerySchema
  >;

export type CreatePromotionInput =
  z.infer<
    typeof createPromotionSchema
  >;

export type UpdatePromotionInput =
  z.infer<
    typeof updatePromotionSchema
  >;

export type PromotionStatus =
  z.infer<
    typeof promotionStatusSchema
  >;
