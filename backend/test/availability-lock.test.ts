import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "../src/generated/prisma/client.js";
import { lockBranchAvailability } from "../src/shared/availability/availability-lock.js";

describe("bloqueo de concurrencia para reservas", () => {
  it("convierte a texto el resultado void del bloqueo de PostgreSQL", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ locked: "" }]);
    const transaction = {
      $queryRaw: queryRaw,
    } as unknown as Prisma.TransactionClient;

    await lockBranchAvailability(transaction, "sucursal-prueba");

    expect(queryRaw).toHaveBeenCalledOnce();
    const query = queryRaw.mock.calls[0]?.[0] as {
      text: string;
      values: unknown[];
    };

    expect(query.text).toContain("pg_advisory_xact_lock");
    expect(query.text).toContain("::text AS locked");
    expect(query.values).toEqual([
      "branch-availability:sucursal-prueba",
    ]);
  });
});
