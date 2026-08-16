import { z } from "zod";
import { RESERVATION_POLICY_VERSION } from "../../shared/legal/legal-versions.js";

const uuidSchema = z
  .string()
  .uuid("El identificador no es válido.");

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
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) ===
          value
      );
    },
    {
      message: "La fecha no es válida.",
    },
  );

const timeSchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "La hora debe tener el formato HH:mm.",
  );

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

const moneySchema = z.coerce
  .number()
  .finite()
  .min(
    0,
    "El monto no puede ser negativo.",
  )
  .max(
    999999999.99,
    "El monto ingresado es demasiado alto.",
  );

const reservationDetailSchema =
  z.object({
    productoSucursalId:
      uuidSchema,

    cantidadSolicitada: z.coerce
      .number()
      .finite()
      .positive(
        "La cantidad solicitada debe ser mayor que cero.",
      )
      .max(
        999999999.999,
        "La cantidad solicitada es demasiado alta.",
      ),

    observaciones:
      optionalText(500),
  });

const availabilityFields = {
  sucursalId: uuidSchema,
  zonaId: uuidSchema,

  fechaReserva:
    dateSchema,

  horaReserva:
    timeSchema,

  duracionMinutos: z.coerce
    .number()
    .int()
    .min(
      30,
      "La reserva debe durar al menos 30 minutos.",
    )
    .max(
      720,
      "La reserva no puede superar las 12 horas.",
    ),

  cantidadPersonas: z.coerce
    .number()
    .int()
    .min(
      1,
      "La cantidad de personas debe ser mayor que cero.",
    )
    .max(
      2000,
      "La cantidad de personas es demasiado alta.",
    ),
};

const approvalDetailSchema =
  z.object({
    detalleId: uuidSchema,

    cantidadAprobada: z.coerce
      .number()
      .finite()
      .min(
        0,
        "La cantidad aprobada no puede ser negativa.",
      )
      .max(
        999999999.999,
        "La cantidad aprobada es demasiado alta.",
      ),
  });

const paymentMethodSchema =
  z.enum([
    "EFECTIVO",
    "YAPE",
    "PLIN",
    "TARJETA",
    "TRANSFERENCIA",
  ]);

export const registerReservationPaymentSchema =
  z.object({
    metodoPago:
      paymentMethodSchema,

    monto: z.coerce
      .number()
      .finite()
      .positive(
        "El monto debe ser mayor que cero.",
      )
      .max(
        999999999.99,
        "El monto ingresado es demasiado alto.",
      ),

    numeroOperacion:
      optionalText(100),

    observaciones:
      optionalText(1000),
  });

export const confirmReservationPaymentSchema =
  z.object({
    cajaId: uuidSchema,

    observacion:
      optionalText(1000),
  });

export const attendReservationSchema =
  z.object({
    vendedorId: z
      .union([
        uuidSchema,
        z.literal(""),
        z.null(),
      ])
      .optional()
      .transform((value) => value || null),

    mozoId: z
      .union([
        uuidSchema,
        z.literal(""),
        z.null(),
      ])
      .optional()
      .transform((value) => value || null),

    observaciones:
      optionalText(2000),
  });

export const cancelReservationSchema =
  z.object({
    motivo: z
      .string()
      .trim()
      .min(
        3,
        "El motivo debe tener al menos 3 caracteres.",
      )
      .max(
        2000,
        "El motivo es demasiado largo.",
      ),

    penalidadCancelacion:
      moneySchema
        .optional()
        .default(0),
  });

export const reservationPaymentIdSchema =
  z.object({
    id: uuidSchema,
    paymentId: uuidSchema,
  });

export const reviewReservationSchema =
  z.object({
    observacion:
      optionalText(1000),
  });

export const approveReservationSchema =
  z
    .object({
      detalles: z
        .array(
          approvalDetailSchema,
        )
        .max(
          100,
          "No se pueden procesar más de 100 productos.",
        )
        .optional()
        .default([]),

      totalEstimado:
        moneySchema,

      adelantoRequerido:
        moneySchema
          .optional()
          .default(0),

      observacion:
        optionalText(1000),
    })
    .superRefine(
      (data, context) => {
        const detailIds =
          data.detalles.map(
            (detail) =>
              detail.detalleId,
          );

        if (
          new Set(detailIds).size !==
          detailIds.length
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "Un detalle no puede aparecer más de una vez.",

            path: ["detalles"],
          });
        }

        if (
          data.adelantoRequerido >
          data.totalEstimado
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "El adelanto requerido no puede superar el total estimado.",

            path: [
              "adelantoRequerido",
            ],
          });
        }
      },
    );

export const rejectReservationSchema =
  z.object({
    motivo: z
      .string()
      .trim()
      .min(
        3,
        "El motivo debe tener al menos 3 caracteres.",
      )
      .max(
        1000,
        "El motivo es demasiado largo.",
      ),
  });

export const reservationOptionsQuerySchema =
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

export const reservationAvailabilityQuerySchema =
  z.object({
    ...availabilityFields,
  });

export const listReservationsQuerySchema =
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
        "TODOS",
        "SOLICITADA",
        "EN_REVISION",
        "ESPERANDO_ADELANTO",
        "CONFIRMADA",
        "RECHAZADA",
        "CANCELADA",
        "ATENDIDA",
        "NO_ASISTIO",
      ])
      .optional()
      .default("TODOS"),

    tipoReserva: z
      .enum([
        "TODOS",
        "NORMAL",
        "EVENTO",
        "SOLO_ZONA",
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
      path: ["fechaHasta"],
    },
  );

const createReservationBaseSchema =
  z.object({
      clienteId: uuidSchema,

      ...availabilityFields,

      tipoReserva: z.enum([
        "NORMAL",
        "EVENTO",
        "SOLO_ZONA",
      ]),

      nombreEvento:
        optionalText(180),

      observaciones:
        optionalText(2000),

      totalEstimado:
        moneySchema.optional(),

      adelantoRequerido:
        moneySchema
          .optional()
          .default(0),

      detalles: z
        .array(
          reservationDetailSchema,
        )
        .max(
          100,
          "Una reserva no puede contener más de 100 productos.",
        )
        .optional()
        .default([]),

      aceptaPoliticaReserva: z.boolean().optional(),
      versionPoliticaReserva: z.string().trim().max(30).optional(),
    });

function validateReservationInput(
  data: {
    tipoReserva:
      | "NORMAL"
      | "EVENTO"
      | "SOLO_ZONA";
    nombreEvento?: string | null;
    detalles: Array<{
      productoSucursalId: string;
    }>;
  },
  context: z.RefinementCtx,
) {
  if (
    data.tipoReserva === "EVENTO" &&
    !data.nombreEvento
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "El nombre del evento es obligatorio.",
      path: ["nombreEvento"],
    });
  }

  const productIds = data.detalles.map(
    (detail) => detail.productoSucursalId,
  );

  if (
    new Set(productIds).size !==
    productIds.length
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Un producto no puede repetirse dentro de la reserva.",
      path: ["detalles"],
    });
  }
}

export const createReservationSchema =
  createReservationBaseSchema.superRefine(
    validateReservationInput,
  );

export const createClientReservationSchema =
  createReservationBaseSchema
    .omit({
      clienteId: true,
      totalEstimado: true,
      adelantoRequerido: true,
    })
    .superRefine((data, context) => {
      validateReservationInput(data, context);

      if (
        data.aceptaPoliticaReserva !== true ||
        data.versionPoliticaReserva !== RESERVATION_POLICY_VERSION
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debes aceptar la Política de Reservas y Cancelaciones vigente.",
          path: ["aceptaPoliticaReserva"],
        });
      }
    });

export const cancelClientReservationSchema =
  cancelReservationSchema.omit({
    penalidadCancelacion: true,
  });

export const rescheduleReservationSchema =
  z.object({
    ...availabilityFields,
  });

export const reservationIdSchema =
  z.object({
    id: uuidSchema,
  });

export type ReservationOptionsQuery =
  z.infer<
    typeof reservationOptionsQuerySchema
  >;

export type ReservationAvailabilityQuery =
  z.infer<
    typeof reservationAvailabilityQuerySchema
  >;

export type ListReservationsQuery =
  z.infer<
    typeof listReservationsQuerySchema
  >;

export type CreateReservationInput =
  z.infer<
    typeof createReservationSchema
  >;

export type ReviewReservationInput =
  z.infer<
    typeof reviewReservationSchema
  >;

export type ApproveReservationInput =
  z.infer<
    typeof approveReservationSchema
  >;

export type RejectReservationInput =
  z.infer<
    typeof rejectReservationSchema
  >;

export type RegisterReservationPaymentInput =
  z.infer<
    typeof registerReservationPaymentSchema
  >;

export type ConfirmReservationPaymentInput =
  z.infer<
    typeof confirmReservationPaymentSchema
  >;

export type AttendReservationInput =
  z.infer<
    typeof attendReservationSchema
  >;

export type CancelReservationInput =
  z.infer<
    typeof cancelReservationSchema
  >;

export type CreateClientReservationInput =
  z.infer<
    typeof createClientReservationSchema
  >;

export type CancelClientReservationInput =
  z.infer<
    typeof cancelClientReservationSchema
  >;

export type RescheduleReservationInput =
  z.infer<
    typeof rescheduleReservationSchema
  >;
