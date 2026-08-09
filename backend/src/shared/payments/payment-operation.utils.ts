import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  AppError,
} from "../errors/app-error.js";

export function normalizePaymentOperationNumber(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase();
}

export async function lockPaymentOperationNumbers(
  transaction: Prisma.TransactionClient,
  values: string[],
): Promise<string[]> {
  const normalizedInput = values.map(
    normalizePaymentOperationNumber,
  );
  const normalizedValues = [
    ...new Set(normalizedInput),
  ].sort();

  if (
    normalizedValues.length !==
    normalizedInput.length
  ) {
    throw new AppError(
      400,
      "Una misma operación electrónica no puede utilizarse más de una vez.",
      "OPERACION_PAGO_REPETIDA",
    );
  }

  for (
    const value
    of normalizedValues
  ) {
    /*
     * El bloqueo transaccional evita que una venta y una
     * reserva registren simultáneamente la misma operación.
     * El orden estable previene interbloqueos cuando hay
     * varios medios de pago en una sola venta.
     */
    await transaction.$queryRaw<
      Array<{
        locked: number;
      }>
    >(
      Prisma.sql`
        SELECT 1::integer AS "locked"
        WHERE pg_advisory_xact_lock(
          hashtextextended(${value}, 0)
        ) IS NULL
      `,
    );
  }

  return normalizedValues;
}

export async function assertPaymentOperationsAvailable(
  transaction: Prisma.TransactionClient,
  operationNumbers: string[],
): Promise<void> {
  if (
    operationNumbers.length === 0
  ) {
    return;
  }

  const normalizedValues =
    await lockPaymentOperationNumbers(
      transaction,
      operationNumbers,
    );

  const [
    salePayment,
    reservationPayment,
  ] = await Promise.all([
    transaction.pagoVenta.findFirst({
      where: {
        numeroOperacion: {
          in:
            normalizedValues,

          mode:
            "insensitive",
        },

        estado: {
          not:
            "ANULADO",
        },
      },

      select: {
        numeroOperacion:
          true,
      },
    }),

    transaction.pagoReserva.findFirst({
      where: {
        numeroOperacion: {
          in:
            normalizedValues,

          mode:
            "insensitive",
        },

        estado: {
          not:
            "ANULADO",
        },
      },

      select: {
        numeroOperacion:
          true,
      },
    }),
  ]);

  const duplicated =
    salePayment
      ?.numeroOperacion ??
    reservationPayment
      ?.numeroOperacion;

  if (duplicated) {
    throw new AppError(
      409,
      `El número de operación "${duplicated}" ya fue registrado.`,
      "OPERACION_PAGO_DUPLICADA",
    );
  }
}
