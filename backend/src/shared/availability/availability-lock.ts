import { Prisma } from "../../generated/prisma/client.js";

export async function lockBranchAvailability(
  transaction: Prisma.TransactionClient,
  branchId: string,
): Promise<void> {
  /*
   * pg_advisory_xact_lock devuelve el tipo nativo void. El adaptador pg de
   * Prisma no puede deserializarlo, por lo que lo convertimos a texto aunque
   * el valor no se utilice. El bloqueo se mantiene hasta cerrar la transacción.
   */
  await transaction.$queryRaw<Array<{ locked: string }>>(
    Prisma.sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${`branch-availability:${branchId}`}, 0)
      )::text AS locked
    `,
  );
}
