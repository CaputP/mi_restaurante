import {
  Prisma,
} from "../../generated/prisma/client.js";

/**
 * Serializa el primer movimiento y cualquier edición estructural de un
 * programa. Ambos flujos deben tomar este bloqueo antes de releer reglas.
 */
export async function lockLoyaltyProgramRules(
  transaction:
    Prisma.TransactionClient,
  programId: string,
): Promise<void> {
  const lockKey =
    `loyalty-program-rules:${programId}`;

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
}
