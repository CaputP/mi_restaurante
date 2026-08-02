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

export type ReportOptionsQuery =
  z.infer<
    typeof reportOptionsQuerySchema
  >;

export type ReportSummaryQuery =
  z.infer<
    typeof reportSummaryQuerySchema
  >;