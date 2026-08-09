import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  AppError,
} from "../../shared/errors/app-error.js";

const LIMA_TIME_ZONE =
  "America/Lima";

const LIMA_UTC_OFFSET =
  "-05:00";

export type LoyaltyOperationalDay = {
  dateText: string;
  dateOnly: Date;
  startOfDay: Date;
  endOfDay: Date;
};

/**
 * Convierte un instante al día comercial de Lima.
 *
 * `dateOnly` se utiliza con columnas PostgreSQL DATE,
 * mientras que el intervalo semiabierto [inicio, fin)
 * se utiliza con timestamps de ventas.
 */
export function getLoyaltyOperationalDay(
  referenceDate: Date,
): LoyaltyOperationalDay {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          LIMA_TIME_ZONE,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    ).formatToParts(
      referenceDate,
    );

  const year =
    parts.find(
      (part) =>
        part.type ===
        "year",
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type ===
        "month",
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type ===
        "day",
    )?.value;

  if (
    !year ||
    !month ||
    !day
  ) {
    throw new AppError(
      500,
      "No se pudo determinar la fecha operativa.",
      "FECHA_OPERATIVA_INVALIDA",
    );
  }

  const dateText =
    `${year}-${month}-${day}`;

  const dateOnly =
    new Date(
      `${dateText}T00:00:00.000Z`,
    );

  const startOfDay =
    new Date(
      `${dateText}T00:00:00${LIMA_UTC_OFFSET}`,
    );

  const endOfDay =
    new Date(
      startOfDay.getTime() +
      24 * 60 * 60 * 1000,
    );

  return {
    dateText,
    dateOnly,
    startOfDay,
    endOfDay,
  };
}

type DailyVisitInput = {
  clientId: string;
  programId: string;
  operationalDay:
    LoyaltyOperationalDay;
};

/**
 * Devuelve 1 solamente para la primera compra confirmada
 * del cliente en el programa durante el día de Lima.
 *
 * El bloqueo transaccional hace atómica la comprobación:
 * dos ventas concurrentes no pueden acreditar dos visitas.
 */
export async function resolveDailyVisitIncrement(
  transaction:
    Prisma.TransactionClient,
  input: DailyVisitInput,
): Promise<0 | 1> {
  const lockKey = [
    "loyalty-daily-visit",
    input.clientId,
    input.programId,
    input.operationalDay
      .dateText,
  ].join(":");

  /*
   * pg_advisory_xact_lock devuelve void. La conversión
   * a texto permite que el adaptador pg lo deserialice.
   */
  await transaction.$queryRaw<
    Array<{
      locked: string;
    }>
  >(
    Prisma.sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${lockKey}, 0)
      )::text AS locked
    `,
  );

  const existingDailyVisit =
    await transaction
      .movimientoFidelizacion
      .findFirst({
        where: {
          clienteId:
            input.clientId,

          programaId:
            input.programId,

          estado:
            "ACTIVO",

          visitasAplicadas: {
            gt:
              0,
          },

          venta: {
            estado:
              "CONFIRMADA",

            createdAt: {
              gte:
                input
                  .operationalDay
                  .startOfDay,

              lt:
                input
                  .operationalDay
                  .endOfDay,
            },
          },
        },

        select: {
          id:
            true,
        },
      });

  return existingDailyVisit
    ? 0
    : 1;
}
