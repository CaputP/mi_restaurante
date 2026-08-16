import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import jwt from "jsonwebtoken";
import request from "supertest";

import {
  app,
} from "../src/app.js";

import {
  env,
} from "../src/config/env.js";

import {
  Prisma,
} from "../src/generated/prisma/client.js";

import {
  prisma,
} from "../src/lib/prisma.js";

import {
  getClientLoyaltyProfile,
} from "../src/modules/loyalty/loyalty-client.service.js";

import {
  listAvailableLoyaltyPrograms,
} from "../src/modules/loyalty/loyalty-availability.service.js";

import {
  getLoyaltyApplicableBranchNames,
  isLoyaltyProgramDeliverable,
} from "../src/modules/loyalty/loyalty-availability.policy.js";

import {
  calculateLoyaltyProgress,
} from "../src/modules/loyalty/loyalty-progress.policy.js";

import {
  loyaltyStructuralRulesChanged,
} from "../src/modules/loyalty/loyalty-program-version.policy.js";

import {
  getClientLoyaltySummary,
} from "../src/modules/loyalty/loyalty-summary.service.js";

import {
  hasAvailablePromotionUses,
  promotionClaimChangesPublicAvailability,
  promotionReversalChangesPublicAvailability,
} from "../src/modules/promotions/promotion-availability.policy.js";

import {
  getPromotionApplicability,
  listAvailablePromotions,
} from "../src/modules/promotions/promotions-client.service.js";

import {
  createPromotionSchema,
} from "../src/modules/promotions/promotions.schema.js";

function signAccessToken(
  userId: string,
): string {
  return jwt.sign(
    {
      sessionVersion:
        1,
    },
    env.JWT_SECRET,
    {
      subject:
        userId,

      expiresIn:
        300,

      issuer:
        "el-vallecito-api",

      audience:
        "el-vallecito-web",

      algorithm:
        "HS256",
    },
  );
}

function authenticatedUser(
  role: string,
  permissions: string[],
) {
  return {
    id:
      "11111111-1111-4111-8111-111111111111",

    correo:
      "cliente@example.com",

    estado:
      "ACTIVO",

    sessionVersion:
      1,

    rol: {
      codigo:
        role,

      permisos:
        permissions.map(
          (code) => ({
            permiso: {
              codigo:
                code,
            },
          }),
        ),
    },
  };
}

describe("catálogo de beneficios del cliente", () => {
  it("protege los catálogos con rol de cliente y permiso explícito", async () => {
    const userId =
      "11111111-1111-4111-8111-111111111111";

    const findUser =
      vi.spyOn(
        prisma.usuario,
        "findUnique",
      )
        .mockResolvedValueOnce(
          authenticatedUser(
            "CLIENTE",
            [
              "CLIENTE_PREMIOS_VER",
            ],
          ) as never,
        )
        .mockResolvedValueOnce(
          authenticatedUser(
            "CLIENTE",
            [],
          ) as never,
        )
        .mockResolvedValueOnce(
          authenticatedUser(
            "CLIENTE",
            [
              "CLIENTE_PREMIOS_VER",
            ],
          ) as never,
        )
        .mockResolvedValueOnce(
          authenticatedUser(
            "ADMINISTRADOR_GENERAL",
            [
              "CLIENTE_PREMIOS_VER",
            ],
          ) as never,
        );

    const findPrograms =
      vi.spyOn(
        prisma
          .programaFidelizacion,
        "findMany",
      )
        .mockResolvedValue([]);

    const findPromotions =
      vi.spyOn(
        prisma.promocion,
        "findMany",
      )
        .mockResolvedValue([]);

    const allowed =
      await request(app)
        .get(
          "/api/v1/loyalty/programs/available",
        )
        .set(
          "Authorization",
          `Bearer ${signAccessToken(userId)}`,
        )
        .expect(200);

    expect(allowed.body.data)
      .toEqual({
        programas:
          [],

        total:
          0,
      });

    await request(app)
      .get(
        "/api/v1/loyalty/programs/available",
      )
      .set(
        "Authorization",
        `Bearer ${signAccessToken(userId)}`,
      )
      .expect(403);

    const promotionsAllowed =
      await request(app)
        .get(
          "/api/v1/promotions/available",
        )
        .set(
          "Authorization",
          `Bearer ${signAccessToken(userId)}`,
        )
        .expect(200);

    expect(
      promotionsAllowed
        .body
        .data,
    ).toEqual({
      promociones:
        [],

      total:
        0,
    });

    await request(app)
      .get(
        "/api/v1/promotions/available",
      )
      .set(
        "Authorization",
        `Bearer ${signAccessToken(userId)}`,
      )
      .expect(403);

    expect(findUser)
      .toHaveBeenCalledTimes(4);

    expect(findPrograms)
      .toHaveBeenCalledOnce();

    expect(findPromotions)
      .toHaveBeenCalledOnce();
  });

  it("aplica los permisos específicos antes de las rutas administrativas", async () => {
    const userId =
      "11111111-1111-4111-8111-111111111111";

    vi.spyOn(
      prisma.usuario,
      "findUnique",
    )
      .mockResolvedValue(
        authenticatedUser(
          "ADMINISTRADOR_GENERAL",
          [],
        ) as never,
      );

    const token =
      signAccessToken(
        userId,
      );

    await request(app)
      .get(
        "/api/v1/loyalty/options",
      )
      .set(
        "Authorization",
        `Bearer ${token}`,
      )
      .expect(403);

    await request(app)
      .get(
        "/api/v1/promotions/options",
      )
      .set(
        "Authorization",
        `Bearer ${token}`,
      )
      .expect(403);
  });

  it("calcula programas mixtos con la meta menos avanzada y limita al 100 %", () => {
    expect(
      calculateLoyaltyProgress({
        tipo:
          "AMBOS",

        visitasAcumuladas:
          8,

        montoAcumulado:
          250,

        ciclosCompletados:
          0,

        visitasRequeridas:
          10,

        montoRequerido:
          200,
      }),
    ).toEqual({
      porcentaje:
        80,

      porcentajeVisitas:
        80,

      porcentajeMonto:
        100,

      visitasCicloActual:
        8,

      montoCicloActual:
        200,
    });
  });

  it("muestra el avance del ciclo siguiente después de entregar un premio", () => {
    expect(
      calculateLoyaltyProgress({
        tipo:
          "VISITAS",

        visitasAcumuladas:
          7,

        montoAcumulado:
          0,

        ciclosCompletados:
          1,

        visitasRequeridas:
          5,

        montoRequerido:
          null,
      }),
    ).toEqual({
      porcentaje:
        40,

      porcentajeVisitas:
        40,

      porcentajeMonto:
        null,

      visitasCicloActual:
        2,

      montoCicloActual:
        0,
    });
  });

  it("limita la meta visible cuando un programa mixto conserva saldo excedente", () => {
    expect(
      calculateLoyaltyProgress({
        tipo:
          "AMBOS",

        visitasAcumuladas:
          20,

        montoAcumulado:
          100,

        ciclosCompletados:
          1,

        visitasRequeridas:
          5,

        montoRequerido:
          100,
      }),
    ).toEqual({
      porcentaje:
        0,

      porcentajeVisitas:
        100,

      porcentajeMonto:
        0,

      visitasCicloActual:
        5,

      montoCicloActual:
        0,
    });
  });

  it("protege las reglas económicas cuando el programa ya tiene historial", () => {
    const rules = {
      sucursalId:
        null,

      tipo:
        "VISITAS",

      visitasRequeridas:
        5,

      montoRequerido:
        null,

      tipoRecompensa:
        "PRODUCTO_GRATIS",

      productoPremioId:
        "producto-1",

      cantidadPremio:
        1,

      montoDescuento:
        null,

      porcentajeDescuento:
        null,

      descripcionBeneficio:
        null,

      vigenciaDiasPremio:
        30,

      automatico:
        true,

      fechaInicio:
        new Date(
          "2026-08-01T00:00:00.000Z",
        ),
    };

    expect(
      loyaltyStructuralRulesChanged(
        rules,
        {
          ...rules,
          visitasRequeridas:
            10,
        },
      ),
    ).toBe(true);

    expect(
      loyaltyStructuralRulesChanged(
        rules,
        {
          ...rules,
        },
      ),
    ).toBe(false);
  });

  it("publica el alcance real del producto premio por sucursal", () => {
    const branchProgram = {
      sucursalId:
        "sucursal-1",

      tipoRecompensa:
        "PRODUCTO_GRATIS",

      sucursal: {
        nombre:
          "Sede Chocco",
      },

      productoPremio: {
        sucursales: [
          {
            sucursalId:
              "sucursal-2",

            sucursal: {
              nombre:
                "Sede Centro",
            },
          },
        ],
      },
    };

    expect(
      isLoyaltyProgramDeliverable(
        branchProgram,
      ),
    ).toBe(false);

    expect(
      getLoyaltyApplicableBranchNames({
        ...branchProgram,
        sucursalId:
          null,
        sucursal:
          null,
      }),
    ).toEqual([
      "Sede Centro",
    ]);
  });

  it("solo anuncia combos en sedes donde están disponibles todos sus productos", () => {
    const applicability =
      getPromotionApplicability({
        tipo:
          "COMBO",

        sucursalId:
          null,

        sucursal:
          null,

        productos: [
          {
            producto: {
              sucursales: [
                {
                  sucursalId:
                    "sucursal-1",

                  sucursal: {
                    nombre:
                      "Sede Chocco",
                  },
                },
                {
                  sucursalId:
                    "sucursal-2",

                  sucursal: {
                    nombre:
                      "Sede Centro",
                  },
                },
              ],
            },
          },
          {
            producto: {
              sucursales: [
                {
                  sucursalId:
                    "sucursal-2",

                  sucursal: {
                    nombre:
                      "Sede Centro",
                  },
                },
              ],
            },
          },
        ],
      });

    expect([
      ...applicability
        .branchIds,
    ]).toEqual([
      "sucursal-2",
    ]);

    expect(
      applicability
        .branchNames,
    ).toEqual([
      "Sede Centro",
    ]);
  });

  it("resume ventas únicas sin multiplicarlas por cada programa", async () => {
    vi.spyOn(
      prisma,
      "$queryRaw",
    )
      .mockResolvedValue([
        {
          visitasAcumuladas:
            2,

          montoAcumulado:
            new Prisma.Decimal(
              85.5,
            ),
        },
      ]);

    await expect(
      getClientLoyaltySummary(
        "11111111-1111-4111-8111-111111111111",
      ),
    ).resolves.toEqual({
      visitasAcumuladas:
        2,

      montoAcumulado:
        85.5,
    });
  });

  it("separa premios utilizables y calcula totales sin truncarlos al historial visible", async () => {
    vi.spyOn(
      prisma.usuario,
      "findUnique",
    ).mockResolvedValue({
      id:
        "cliente-1",

      nombres:
        "Ana",

      apellidos:
        "Quispe",

      correo:
        "ana@example.com",

      telefono:
        null,

      rol: {
        codigo:
          "CLIENTE",

        nombre:
          "Cliente",
      },

      progresosFidelizacion:
        [],

      premiosObtenidos:
        [],

      canjesPremioCliente:
        [],
    } as never);

    vi.spyOn(
      prisma,
      "$queryRaw",
    ).mockResolvedValue([]);

    vi.spyOn(
      prisma.premioCliente,
      "count",
    )
      .mockResolvedValueOnce(
        180,
      )
      .mockResolvedValueOnce(
        125,
      );

    const availableRewards =
      vi.spyOn(
        prisma.premioCliente,
        "findMany",
      ).mockResolvedValue([]);

    vi.spyOn(
      prisma.canjePremioCliente,
      "aggregate",
    ).mockResolvedValue({
      _count: {
        _all:
          130,
      },

      _sum: {
        montoAplicado:
          new Prisma.Decimal(
            640.5,
          ),
      },
    } as never);

    const result =
      await getClientLoyaltyProfile(
        "cliente-1",
      );

    expect(
      availableRewards,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where:
          expect.objectContaining({
            clienteId:
              "cliente-1",

            estado:
              "DISPONIBLE",

            fechaVencimiento: {
              gte:
                expect.any(
                  Date,
                ),
            },
          }),

        take:
          100,
      }),
    );

    expect(result.resumen)
      .toMatchObject({
        premiosTotales:
          180,

        premiosDisponibles:
          125,

        canjesRealizados:
          130,

        ahorroPorPremios:
          640.5,
      });
  });

  it("incluye programas vigentes aunque el cliente todavía no tenga progreso", async () => {
    const findMany =
      vi.spyOn(
        prisma
          .programaFidelizacion,
        "findMany",
      )
        .mockResolvedValue([
          {
            id:
              "programa-1",

            sucursalId:
              null,

            nombre:
              "Cinco visitas",

            descripcion:
              "Premio por visitas",

            tipo:
              "VISITAS",

            visitasRequeridas:
              5,

            montoRequerido:
              null,

            tipoRecompensa:
              "PRODUCTO_GRATIS",

            cantidadPremio:
              new Prisma.Decimal(
                1,
              ),

            montoDescuento:
              null,

            porcentajeDescuento:
              null,

            descripcionBeneficio:
              null,

            vigenciaDiasPremio:
              30,

            fechaInicio:
              new Date(
                "2026-08-01T00:00:00.000Z",
              ),

            fechaFin:
              null,

            sucursal:
              null,

            productoPremio: {
              nombre:
                "Bebida",

              sucursales: [
                {
                  sucursalId:
                    "sucursal-1",

                  sucursal: {
                    nombre:
                      "Sede Chocco",
                  },
                },
              ],
            },

            progresos:
              [],
          },
        ] as never);

    const result =
      await listAvailableLoyaltyPrograms(
        "cliente-1",
        new Date(
          "2026-08-16T03:00:00.000Z",
        ),
      );

    expect(findMany)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          where:
            expect.objectContaining({
              activo:
                true,

              automatico:
                true,

              fechaInicio: {
                lte:
                  new Date(
                    "2026-08-15T00:00:00.000Z",
                  ),
              },
            }),
        }),
      );

    expect(
      result
        .programas[0]
        ?.progreso,
    ).toEqual({
      iniciado:
        false,

      visitasAcumuladas:
        0,

      montoAcumulado:
        0,

      ciclosCompletados:
        0,

      porcentaje:
        0,

      porcentajeVisitas:
        0,

      porcentajeMonto:
        null,

      visitasCicloActual:
        0,

      montoCicloActual:
        0,

      updatedAt:
        null,
    });

    expect(
      result
        .programas[0],
    ).not.toHaveProperty(
      "creadoPorId",
    );

    expect(
      result
        .programas[0]
        ?.fechaInicio,
    ).toBe(
      "2026-08-01",
    );

    expect(
      result.total,
    ).toBe(1);
  });

  it("no publica promociones agotadas ni contadores internos", async () => {
    const findPromotions =
      vi.spyOn(
      prisma.promocion,
      "findMany",
    )
      .mockResolvedValue([
        {
          id:
            "promocion-vigente",

          nombre:
            "Descuento del día",

          descripcion:
            "Descuento automático",

          tipo:
            "DESCUENTO_PORCENTAJE",

          valor:
            new Prisma.Decimal(
              10,
            ),

          consumoMinimo:
            new Prisma.Decimal(
              30,
            ),

          acumulable:
            false,

          maximoUsos:
            10,

          usosActuales:
            9,

          fechaInicio:
            new Date(
              "2026-08-01T05:00:00.000Z",
            ),

          fechaFin:
            new Date(
              "2026-08-31T04:59:59.000Z",
            ),

          _count: {
            productos:
              0,
          },

          sucursal:
            null,

          productos:
            [],
        },
        {
          id:
            "promocion-agotada",

          nombre:
            "Promoción agotada",

          descripcion:
            null,

          tipo:
            "DESCUENTO_FIJO",

          valor:
            new Prisma.Decimal(
              5,
            ),

          consumoMinimo:
            new Prisma.Decimal(
              20,
            ),

          acumulable:
            false,

          maximoUsos:
            10,

          usosActuales:
            10,

          fechaInicio:
            new Date(
              "2026-08-01T05:00:00.000Z",
            ),

          fechaFin:
            new Date(
              "2026-08-31T04:59:59.000Z",
            ),

          _count: {
            productos:
              0,
          },

          sucursal:
            null,

          productos:
            [],
        },
      ] as never);

    const referenceDate =
      new Date(
        "2026-08-16T18:00:00.000Z",
      );

    const result =
      await listAvailablePromotions(
        referenceDate,
      );

    expect(findPromotions)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          where:
            expect.objectContaining({
              estado:
                "ACTIVA",

              automatica:
                true,

              fechaInicio: {
                lte:
                  referenceDate,
              },

              fechaFin: {
                gte:
                  referenceDate,
              },

              OR:
                expect.arrayContaining([
                  {
                    sucursalId:
                      null,
                  },
                ]),
            }),
        }),
      );

    expect(
      result.promociones,
    ).toHaveLength(1);

    expect(
      result.promociones[0],
    ).toMatchObject({
      id:
        "promocion-vigente",

      valor:
        10,

      consumoMinimo:
        30,

      aplicacionAutomatica:
        true,

      sujetaACupo:
        true,
    });

    expect(
      result.total,
    ).toBe(1);

    expect(
      result.promociones[0],
    ).not.toHaveProperty(
      "usosActuales",
    );

    expect(
      result.promociones[0],
    ).not.toHaveProperty(
      "maximoUsos",
    );
  });

  it("considera disponible un límite nulo y rechaza un límite alcanzado", () => {
    expect(
      hasAvailablePromotionUses(
        null,
        999,
      ),
    ).toBe(true);

    expect(
      hasAvailablePromotionUses(
        3,
        3,
      ),
    ).toBe(false);

    expect(
      promotionClaimChangesPublicAvailability(
        10,
        9,
      ),
    ).toBe(true);

    expect(
      promotionClaimChangesPublicAvailability(
        10,
        8,
      ),
    ).toBe(false);

    expect(
      promotionReversalChangesPublicAvailability(
        10,
        10,
      ),
    ).toBe(true);

    expect(
      promotionReversalChangesPublicAvailability(
        null,
        10,
      ),
    ).toBe(false);
  });

  it("rechaza cantidades fraccionarias de productos gratis", () => {
    const result =
      createPromotionSchema
        .safeParse({
          sucursalId:
            null,

          nombre:
            "Producto de cortesía",

          descripcion:
            null,

          tipo:
            "PRODUCTO_GRATIS",

          valor:
            1.5,

          consumoMinimo:
            0,

          automatica:
            true,

          acumulable:
            false,

          maximoUsos:
            null,

          fechaInicio:
            "2026-08-16T05:00:00.000Z",

          fechaFin:
            "2026-08-17T05:00:00.000Z",

          estado:
            "ACTIVA",

          productoIds: [
            "11111111-1111-4111-8111-111111111111",
          ],
        });

    expect(result.success)
      .toBe(false);

    expect(
      result.error
        ?.issues[0]
        ?.path,
    ).toEqual([
      "valor",
    ]);
  });
});
