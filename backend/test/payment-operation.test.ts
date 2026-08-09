import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  assertPaymentOperationsAvailable,
  normalizePaymentOperationNumber,
} from "../src/shared/payments/payment-operation.utils.js";
import type { Prisma } from "../src/generated/prisma/client.js";

describe("normalizePaymentOperationNumber", () => {
  it("normaliza espacios y mayúsculas", () => {
    expect(
      normalizePaymentOperationNumber(
        "  op-001-ab  ",
      ),
    ).toBe(
      "OP-001-AB",
    );
  });

  it("rechaza operaciones repetidas aun con distinto uso de mayúsculas", async () => {
    const transaction =
      {} as Prisma.TransactionClient;

    await expect(
      assertPaymentOperationsAvailable(
        transaction,
        ["op-001", " OP-001 "],
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "OPERACION_PAGO_REPETIDA",
    });
  });

  it("bloquea y valida una operación disponible", async () => {
    const queryRaw =
      vi.fn()
        .mockResolvedValue([
          {
            locked: 1,
          },
        ]);

    const transaction = {
      $queryRaw:
        queryRaw,

      pagoVenta: {
        findFirst:
          vi.fn()
            .mockResolvedValue(
              null,
            ),
      },

      pagoReserva: {
        findFirst:
          vi.fn()
            .mockResolvedValue(
              null,
            ),
      },
    } as unknown as Prisma.TransactionClient;

    await expect(
      assertPaymentOperationsAvailable(
        transaction,
        [" op-002 "],
      ),
    ).resolves.toBeUndefined();

    expect(
      queryRaw,
    ).toHaveBeenCalledTimes(1);
  });
});
