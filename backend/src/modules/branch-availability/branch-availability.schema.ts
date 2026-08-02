import { z } from "zod";

const uuidSchema = z
  .string()
  .uuid(
    "El identificador no es válido.",
  );

const nullableUuidSchema =
  z
    .union([
      uuidSchema,
      z.literal(""),
      z.null(),
    ])
    .transform((value) =>
      value === "" ||
      value === null
        ? null
        : value,
    );

const daySchema = z.enum([
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
  "DOMINGO",
]);

const timeSchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "La hora debe tener el formato HH:mm.",
  );

const statusSchema = z.enum([
  "ACTIVO",
  "INACTIVO",
  "ARCHIVADO",
]);

const scheduleSchema = z
  .object({
    diaSemana:
      daySchema,

    horaInicio:
      timeSchema,

    horaFin:
      timeSchema,

    activo: z
      .boolean()
      .optional()
      .default(true),
  })
  .refine(
    (schedule) =>
      schedule.horaInicio <
      schedule.horaFin,
    {
      message:
        "La hora de inicio debe ser anterior a la hora final.",

      path: [
        "horaFin",
      ],
    },
  );

export const branchAvailabilityParamsSchema =
  z.object({
    id:
      uuidSchema,
  });

export const branchBlockParamsSchema =
  z.object({
    id:
      uuidSchema,

    blockId:
      uuidSchema,
  });

export const replaceSchedulesSchema =
  z.object({
    horarios: z
      .array(
        scheduleSchema,
      )
      .max(
        30,
        "No se pueden registrar más de 30 horarios.",
      ),
  });

export const createBlockSchema =
  z
    .object({
      zonaId:
        nullableUuidSchema,

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

      motivo: z
        .string()
        .trim()
        .min(
          3,
          "El motivo debe contener al menos 3 caracteres.",
        )
        .max(
          1000,
          "El motivo no puede superar los 1000 caracteres.",
        ),

      estado:
        statusSchema
          .optional()
          .default(
            "ACTIVO",
          ),
    })
    .refine(
      (data) =>
        new Date(
          data.fechaInicio,
        ).getTime() <
        new Date(
          data.fechaFin,
        ).getTime(),
      {
        message:
          "La fecha inicial debe ser anterior a la fecha final.",

        path: [
          "fechaFin",
        ],
      },
    );

export const updateBlockSchema =
  z
    .object({
      zonaId:
        nullableUuidSchema
          .optional(),

      fechaInicio: z
        .string()
        .datetime({
          offset:
            true,
        })
        .optional(),

      fechaFin: z
        .string()
        .datetime({
          offset:
            true,
        })
        .optional(),

      motivo: z
        .string()
        .trim()
        .min(
          3,
          "El motivo debe contener al menos 3 caracteres.",
        )
        .max(
          1000,
          "El motivo no puede superar los 1000 caracteres.",
        )
        .optional(),
    })
    .refine(
      (data) =>
        Object.values(
          data,
        ).some(
          (value) =>
            value !==
            undefined,
        ),
      {
        message:
          "Debes enviar al menos un campo para actualizar.",
      },
    );

export const updateBlockStatusSchema =
  z.object({
    estado:
      statusSchema,
  });

export type ReplaceSchedulesInput =
  z.infer<
    typeof replaceSchedulesSchema
  >;

export type CreateBlockInput =
  z.infer<
    typeof createBlockSchema
  >;

export type UpdateBlockInput =
  z.infer<
    typeof updateBlockSchema
  >;

export type UpdateBlockStatusInput =
  z.infer<
    typeof updateBlockStatusSchema
  >;