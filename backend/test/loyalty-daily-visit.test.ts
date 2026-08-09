import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  Prisma,
} from "../src/generated/prisma/client.js";

import {
  Prisma as PrismaRuntime,
} from "../src/generated/prisma/client.js";

import {
  applySaleLoyalty,
} from "../src/modules/loyalty/loyalty-processing.service.js";

import {
  getLoyaltyOperationalDay,
  resolveDailyVisitIncrement,
} from "../src/modules/loyalty/loyalty-visit-policy.js";

describe("política de visita diaria de fidelización", () => {
  it("calcula el día usando la zona horaria de Lima", () => {
    const day =
      getLoyaltyOperationalDay(
        new Date(
          "2026-08-09T03:30:00.000Z",
        ),
      );

    expect(day.dateText)
      .toBe("2026-08-08");

    expect(day.dateOnly.toISOString())
      .toBe(
        "2026-08-08T00:00:00.000Z",
      );

    expect(day.startOfDay.toISOString())
      .toBe(
        "2026-08-08T05:00:00.000Z",
      );

    expect(day.endOfDay.toISOString())
      .toBe(
        "2026-08-09T05:00:00.000Z",
      );
  });

  it("acredita la primera compra del día", async () => {
    const queryRaw =
      vi.fn()
        .mockResolvedValue([
          {
            locked: "",
          },
        ]);

    const findFirst =
      vi.fn()
        .mockResolvedValue(null);

    const transaction = {
      $queryRaw:
        queryRaw,

      movimientoFidelizacion: {
        findFirst,
      },
    } as unknown as Prisma.TransactionClient;

    const operationalDay =
      getLoyaltyOperationalDay(
        new Date(
          "2026-08-08T16:00:00.000Z",
        ),
      );

    const result =
      await resolveDailyVisitIncrement(
        transaction,
        {
          clientId:
            "cliente-1",

          programId:
            "programa-1",

          operationalDay,
        },
      );

    expect(result).toBe(1);
    expect(queryRaw).toHaveBeenCalledOnce();

    const query =
      queryRaw.mock.calls[0]?.[0] as {
        text: string;
        values: unknown[];
      };

    expect(query.text)
      .toContain(
        "pg_advisory_xact_lock",
      );

    expect(query.values)
      .toEqual([
        "loyalty-daily-visit:cliente-1:programa-1:2026-08-08",
      ]);

    expect(findFirst)
      .toHaveBeenCalledWith({
        where: {
          clienteId:
            "cliente-1",

          programaId:
            "programa-1",

          estado:
            "ACTIVO",

          visitasAplicadas: {
            gt: 0,
          },

          venta: {
            estado:
              "CONFIRMADA",

            createdAt: {
              gte:
                operationalDay
                  .startOfDay,

              lt:
                operationalDay
                  .endOfDay,
            },
          },
        },

        select: {
          id: true,
        },
      });
  });

  it("no acredita otra visita si ya hubo una compra ese día", async () => {
    const transaction = {
      $queryRaw:
        vi.fn()
          .mockResolvedValue([
            {
              locked: "",
            },
          ]),

      movimientoFidelizacion: {
        findFirst:
          vi.fn()
            .mockResolvedValue({
              id:
                "movimiento-previo",
            }),
      },
    } as unknown as Prisma.TransactionClient;

    const result =
      await resolveDailyVisitIncrement(
        transaction,
        {
          clientId:
            "cliente-1",

          programId:
            "programa-1",

          operationalDay:
            getLoyaltyOperationalDay(
              new Date(
                "2026-08-08T23:45:00.000Z",
              ),
            ),
        },
      );

    expect(result).toBe(0);
  });

  it("suma el consumo de una segunda venta sin sumar otra visita", async () => {
    const progressUpsert =
      vi.fn()
        .mockResolvedValue({
          id:
            "progreso-1",

          visitasAcumuladas:
            1,

          montoAcumulado:
            new PrismaRuntime.Decimal(
              55,
            ),

          ciclosCompletados:
            0,
        });

    const movementCreate =
      vi.fn()
        .mockResolvedValue({
          id:
            "movimiento-2",
        });

    const transaction = {
      $queryRaw:
        vi.fn()
          .mockResolvedValue([
            {
              locked: "",
            },
          ]),

      venta: {
        findUnique:
          vi.fn()
            .mockResolvedValue({
              id:
                "venta-2",

              clienteId:
                "cliente-1",

              sucursalId:
                "sucursal-1",

              subtotal:
                new PrismaRuntime.Decimal(
                  40,
                ),

              descuento:
                new PrismaRuntime.Decimal(
                  5,
                ),

              estado:
                "CONFIRMADA",

              createdAt:
                new Date(
                  "2026-08-08T20:00:00.000Z",
                ),
            }),
      },

      programaFidelizacion: {
        findMany:
          vi.fn()
            .mockResolvedValue([
              {
                id:
                  "programa-1",

                tipo:
                  "VISITAS",

                visitasRequeridas:
                  5,

                montoRequerido:
                  null,

                tipoRecompensa:
                  "BENEFICIO",

                productoPremioId:
                  null,

                cantidadPremio:
                  null,

                montoDescuento:
                  null,

                porcentajeDescuento:
                  null,

                descripcionBeneficio:
                  "Beneficio de prueba",

                vigenciaDiasPremio:
                  30,

                automatico:
                  true,

                productoPremio:
                  null,
              },
            ]),
      },

      movimientoFidelizacion: {
        findUnique:
          vi.fn()
            .mockResolvedValue(null),

        findFirst:
          vi.fn()
            .mockResolvedValue({
              id:
                "movimiento-1",
            }),

        create:
          movementCreate,
      },

      progresoFidelizacion: {
        upsert:
          progressUpsert,
      },
    } as unknown as Prisma.TransactionClient;

    await applySaleLoyalty(
      transaction,
      "venta-2",
    );

    const progressData =
      progressUpsert.mock
        .calls[0]?.[0]
        .update;

    expect(
      progressData
        .visitasAcumuladas,
    ).toEqual({
      increment: 0,
    });

    expect(
      progressData
        .montoAcumulado
        .increment
        .toString(),
    ).toBe("35");

    const movementData =
      movementCreate.mock
        .calls[0]?.[0]
        .data;

    expect(
      movementData
        .visitasAplicadas,
    ).toBe(0);

    expect(
      movementData
        .montoAplicado
        .toString(),
    ).toBe("35");
  });
});
