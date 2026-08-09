import {
  Prisma,
} from "../generated/prisma/client.js";

import {
  prisma,
} from "./prisma.js";

import {
  AppError,
} from "../shared/errors/app-error.js";

const DEFAULT_MAX_ATTEMPTS = 3;

function isRetryableTransactionError(
  error: unknown,
): boolean {
  return (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function retryDelay(
  attempt: number,
): Promise<void> {
  const delayMilliseconds =
    25 * 2 ** attempt;

  return new Promise((resolve) => {
    setTimeout(
      resolve,
      delayMilliseconds,
    );
  });
}

export async function withSerializableTransaction<T>(
  operation: (
    transaction: Prisma.TransactionClient,
  ) => Promise<T>,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
): Promise<T> {
  for (
    let attempt = 0;
    attempt < maxAttempts;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        operation,
        {
          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
        },
      );
    } catch (error: unknown) {
      const shouldRetry =
        isRetryableTransactionError(
          error,
        ) &&
        attempt < maxAttempts - 1;

      if (!shouldRetry) {
        if (
          isRetryableTransactionError(
            error,
          )
        ) {
          throw new AppError(
            409,
            "La operación coincidió con otro cambio. Inténtalo nuevamente.",
            "CONFLICTO_CONCURRENCIA",
          );
        }

        throw error;
      }

      await retryDelay(
        attempt,
      );
    }
  }

  throw new AppError(
    409,
    "No se pudo completar la operación concurrente.",
    "CONFLICTO_CONCURRENCIA",
  );
}
