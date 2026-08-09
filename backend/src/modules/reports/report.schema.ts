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
  ])
  .optional()
  .transform((value) =>
    value || undefined,
  );

const dateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "La fecha debe tener el formato YYYY-MM-DD.",
  );

const optionalDateSchema = z
  .union([
    dateSchema,
    z.literal(""),
  ])
  .optional()
  .transform((value) =>
    value || undefined,
  );

export const reportOptionsQuerySchema =
  z.object({
    sucursalId:
      optionalUuidSchema,
  });

export const reportSummaryQuerySchema =
  z
    .object({
      sucursalId:
        optionalUuidSchema,

      fechaDesde:
        optionalDateSchema,

      fechaHasta:
        optionalDateSchema,
    })
    .superRefine(
      (data, context) => {
        if (
          data.fechaDesde &&
          data.fechaHasta &&
          data.fechaDesde >
            data.fechaHasta
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "La fecha inicial no puede ser posterior a la fecha final.",

            path: [
              "fechaHasta",
            ],
          });
        }

        if (
          data.fechaDesde &&
          data.fechaHasta
        ) {
          const start =
            new Date(
              `${data.fechaDesde}T00:00:00.000Z`,
            );

          const end =
            new Date(
              `${data.fechaHasta}T00:00:00.000Z`,
            );

          const differenceInDays =
            (
              end.getTime() -
              start.getTime()
            ) /
            (
              24 *
              60 *
              60 *
              1000
            );

          if (
            differenceInDays >
            366
          ) {
            context.addIssue({
              code:
                z.ZodIssueCode.custom,

              message:
                "El rango del reporte no puede superar 366 días.",

              path: [
                "fechaHasta",
              ],
            });
          }
        }
      },
    );

export const reportDetailsQuerySchema =
  z.intersection(
    reportSummaryQuerySchema,
    z.object({
      tipo: z.enum([
        "VENTAS",
        "GASTOS",
        "ADELANTOS_RESERVA",
        "PAGOS",
        "PRODUCTOS",
        "PEDIDOS",
        "RESERVAS",
        "CAJAS",
        "BALANCE",
      ]),
      filtro: z
        .string()
        .trim()
        .max(100)
        .optional(),
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
        .default(25),
    }),
  ).superRefine(
    (data, context) => {
      if (!data.filtro) {
        return;
      }

      const allowedFilters: Partial<
        Record<
          typeof data.tipo,
          readonly string[]
        >
      > = {
        VENTAS: [
          "SUBTOTAL",
          "CON_ADELANTO",
          "CON_DESCUENTO",
          "CON_PROPINA",
          "SALDO_CAJA",
        ],
        ADELANTOS_RESERVA: [
          "EFECTIVO",
          "YAPE",
          "PLIN",
          "TARJETA",
          "TRANSFERENCIA",
        ],
        PAGOS: [
          "EFECTIVO",
          "YAPE",
          "PLIN",
          "TARJETA",
          "TRANSFERENCIA",
        ],
        PEDIDOS: [
          "ABIERTO",
          "ENVIADO",
          "EN_PREPARACION",
          "LISTO",
          "ENTREGA_PARCIAL",
          "ENTREGADO",
          "PAGADO",
          "CANCELADO",
        ],
        RESERVAS: [
          "SOLICITADA",
          "EN_REVISION",
          "ESPERANDO_ADELANTO",
          "CONFIRMADA",
          "RECHAZADA",
          "CANCELADA",
          "ATENDIDA",
          "NO_ASISTIO",
        ],
        CAJAS: [
          "ABIERTA",
          "CERRADA",
          "ANULADA",
          "DIFERENCIA",
        ],
      };

      if (
        data.tipo === "PRODUCTOS" &&
        !uuidSchema.safeParse(
          data.filtro,
        ).success
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filtro"],
          message:
            "El producto seleccionado no es válido.",
        });
        return;
      }

      const values =
        allowedFilters[data.tipo];

      if (
        data.tipo !== "PRODUCTOS" &&
        (
          !values ||
          !values.includes(
            data.filtro,
          )
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filtro"],
          message:
            "El filtro no es válido para este detalle de reporte.",
        });
      }
    },
  );

export type ReportOptionsQuery =
  z.infer<
    typeof reportOptionsQuerySchema
  >;

export type ReportSummaryQuery =
  z.infer<
    typeof reportSummaryQuerySchema
  >;

export type ReportDetailsQuery =
  z.infer<
    typeof reportDetailsQuerySchema
  >;
