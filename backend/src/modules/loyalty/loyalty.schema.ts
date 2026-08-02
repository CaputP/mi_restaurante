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

const dateOnlySchema =
  z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "La fecha debe tener el formato YYYY-MM-DD.",
  );

const nullableDateOnlySchema =
  z.union([
    dateOnlySchema,
    z.literal(""),
    z.null(),
  ]).transform((value) =>
    value === "" ? null : value,
  );

const loyaltyTypeSchema =
  z.enum([
    "VISITAS",
    "MONTO_CONSUMIDO",
    "AMBOS",
  ]);

const rewardTypeSchema =
  z.enum([
    "PRODUCTO_GRATIS",
    "DESCUENTO_FIJO",
    "DESCUENTO_PORCENTAJE",
    "BENEFICIO",
  ]);

const programDataSchema =
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
      loyaltyTypeSchema,

    visitasRequeridas: z
      .number()
      .int()
      .min(
        1,
        "La cantidad de visitas debe ser mayor a cero.",
      )
      .max(
        1000,
        "La cantidad de visitas es demasiado alta.",
      )
      .nullable(),

    montoRequerido: z
      .number()
      .positive(
        "El monto requerido debe ser mayor a cero.",
      )
      .max(
        1000000,
        "El monto requerido es demasiado alto.",
      )
      .nullable(),

    tipoRecompensa:
      rewardTypeSchema,

    productoPremioId:
      nullableUuidSchema,

    cantidadPremio: z
      .number()
      .positive(
        "La cantidad del premio debe ser mayor a cero.",
      )
      .max(
        1000,
        "La cantidad del premio es demasiado alta.",
      )
      .nullable(),

    montoDescuento: z
      .number()
      .positive(
        "El descuento debe ser mayor a cero.",
      )
      .max(
        100000,
        "El descuento es demasiado alto.",
      )
      .nullable(),

    porcentajeDescuento: z
      .number()
      .positive(
        "El porcentaje debe ser mayor a cero.",
      )
      .max(
        100,
        "El porcentaje no puede superar el 100 %.",
      )
      .nullable(),

    descripcionBeneficio: z
      .string()
      .trim()
      .max(
        250,
        "El beneficio no puede superar los 250 caracteres.",
      )
      .nullable(),

    vigenciaDiasPremio: z
      .number()
      .int()
      .min(
        1,
        "La vigencia debe ser de al menos un día.",
      )
      .max(
        3650,
        "La vigencia no puede superar los 3650 días.",
      ),

    automatico:
      z.boolean(),

    activo:
      z.boolean(),

    fechaInicio:
      dateOnlySchema,

    fechaFin:
      nullableDateOnlySchema,
  })
  .superRefine(
    (
      data,
      context,
    ) => {
      if (
        (
          data.tipo ===
            "VISITAS" ||
          data.tipo ===
            "AMBOS"
        ) &&
        data.visitasRequeridas ===
          null
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "visitasRequeridas",
          ],

          message:
            "Debes indicar las visitas requeridas.",
        });
      }

      if (
        (
          data.tipo ===
            "MONTO_CONSUMIDO" ||
          data.tipo ===
            "AMBOS"
        ) &&
        data.montoRequerido ===
          null
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "montoRequerido",
          ],

          message:
            "Debes indicar el monto requerido.",
        });
      }

      if (
        data.tipoRecompensa ===
          "PRODUCTO_GRATIS" &&
        (
          !data.productoPremioId ||
          data.cantidadPremio ===
            null
        )
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "productoPremioId",
          ],

          message:
            "Debes seleccionar el producto y su cantidad.",
        });
      }

      if (
        data.tipoRecompensa ===
          "DESCUENTO_FIJO" &&
        data.montoDescuento ===
          null
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "montoDescuento",
          ],

          message:
            "Debes indicar el monto del descuento.",
        });
      }

      if (
        data.tipoRecompensa ===
          "DESCUENTO_PORCENTAJE" &&
        data.porcentajeDescuento ===
          null
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "porcentajeDescuento",
          ],

          message:
            "Debes indicar el porcentaje del descuento.",
        });
      }

      if (
        data.tipoRecompensa ===
          "BENEFICIO" &&
        (
          !data.descripcionBeneficio ||
          data.descripcionBeneficio
            .length < 3
        )
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "descripcionBeneficio",
          ],

          message:
            "Debes describir el beneficio.",
        });
      }

      if (
        data.fechaFin &&
        data.fechaFin <
          data.fechaInicio
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "fechaFin",
          ],

          message:
            "La fecha final no puede ser anterior a la fecha inicial.",
        });
      }
    },
  );

export const loyaltyOptionsQuerySchema =
  z.object({
    sucursalId:
      nullableUuidSchema
        .optional(),
  });

export const loyaltyProgramParamsSchema =
  z.object({
    id:
      uuidSchema,
  });

export const loyaltyProgramListQuerySchema =
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
      loyaltyTypeSchema
        .optional(),

    activo: z
      .enum([
        "TODOS",
        "ACTIVO",
        "INACTIVO",
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

export const createLoyaltyProgramSchema =
  programDataSchema;

export const updateLoyaltyProgramSchema =
  programDataSchema;

export const updateLoyaltyProgramStatusSchema =
  z.object({
    activo:
      z.boolean(),
  });

export type LoyaltyProgramListQuery =
  z.infer<
    typeof loyaltyProgramListQuerySchema
  >;

export type CreateLoyaltyProgramInput =
  z.infer<
    typeof createLoyaltyProgramSchema
  >;

export type UpdateLoyaltyProgramInput =
  z.infer<
    typeof updateLoyaltyProgramSchema
  >;