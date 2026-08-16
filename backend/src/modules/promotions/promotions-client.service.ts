import {
  prisma,
} from "../../lib/prisma.js";

import {
  buildPromotionProductAvailabilityWhere,
  hasAvailablePromotionUses,
} from "./promotion-availability.policy.js";

type PromotionAvailabilityRecord = {
  tipo:
    string;

  sucursalId:
    string | null;

  sucursal:
    | {
        nombre:
          string;
      }
    | null;

  productos: Array<{
    producto: {
      sucursales: Array<{
        sucursalId:
          string;

        sucursal: {
          nombre:
            string;
        };
      }>;
    };
  }>;
};

export function getPromotionApplicability(
  promotion: PromotionAvailabilityRecord,
) {
  if (
    promotion.productos.length ===
    0
  ) {
    return {
      branchIds:
        promotion.sucursalId
          ? new Set([
              promotion
                .sucursalId,
            ])
          : new Set<string>(),

      branchNames:
        promotion.sucursal
          ? [
              promotion
                .sucursal
                .nombre,
            ]
          : [],
    };
  }

  const assignmentsByProduct =
    promotion.productos.map(
      (relation) =>
        new Map(
          relation
            .producto
            .sucursales
            .map(
              (assignment) => [
                assignment
                  .sucursalId,
                assignment
                  .sucursal
                  .nombre,
              ],
            ),
        ),
    );

  const branchIds =
    promotion.tipo ===
    "COMBO"
      ? new Set(
          [
            ...(
              assignmentsByProduct[0]
                ?.keys() ??
              []
            ),
          ].filter(
            (branchId) =>
              assignmentsByProduct
                .every(
                  (assignments) =>
                    assignments.has(
                      branchId,
                    ),
                ),
          ),
        )
      : new Set(
          assignmentsByProduct
            .flatMap(
              (assignments) => [
                ...assignments
                  .keys(),
              ],
            ),
        );

  if (
    promotion.sucursalId
  ) {
    for (const branchId of [
      ...branchIds,
    ]) {
      if (
        branchId !==
        promotion.sucursalId
      ) {
        branchIds.delete(
          branchId,
        );
      }
    }
  }

  const branchNames = [
    ...branchIds,
  ]
    .map(
      (branchId) =>
        assignmentsByProduct
          .find(
            (assignments) =>
              assignments.has(
                branchId,
              ),
          )
          ?.get(
            branchId,
          ),
    )
    .filter(
      (
        name,
      ): name is string =>
        Boolean(name),
    )
    .sort(
      (left, right) =>
        left.localeCompare(
          right,
          "es",
        ),
    );

  return {
    branchIds,
    branchNames,
  };
}

/**
 * Devuelve exclusivamente información comercial publicable. Los contadores
 * de uso se consultan para decidir disponibilidad, pero nunca forman parte
 * del DTO enviado al cliente.
 */
export async function listAvailablePromotions(
  referenceDate = new Date(),
) {
  const promotions =
    await prisma.promocion
      .findMany({
        where: {
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

          OR: [
            {
              sucursalId:
                null,
            },
            {
              sucursal: {
                is: {
                  estado:
                    "ACTIVO",

                  deletedAt:
                    null,
                },
              },
            },
          ],
        },

        select: {
          id: true,
          sucursalId: true,
          nombre: true,
          descripcion: true,
          tipo: true,
          valor: true,
          consumoMinimo: true,
          acumulable: true,
          maximoUsos: true,
          usosActuales: true,
          fechaInicio: true,
          fechaFin: true,

          _count: {
            select: {
              productos:
                true,
            },
          },

          sucursal: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },

          productos: {
            where: {
              producto:
                buildPromotionProductAvailabilityWhere(),
            },

            select: {
              producto: {
                select: {
                  id: true,
                  nombre: true,

                  categoria: {
                    select: {
                      nombre: true,
                    },
                  },

                  sucursales: {
                    where: {
                      estado:
                        "ACTIVO",

                      disponibleVenta:
                        true,

                      sucursal: {
                        estado:
                          "ACTIVO",

                        deletedAt:
                          null,
                      },
                    },

                    select: {
                      sucursalId:
                        true,

                      sucursal: {
                        select: {
                          nombre:
                            true,
                        },
                      },
                    },
                  },
                },
              },
            },

            orderBy: {
              producto: {
                nombre:
                  "asc",
              },
            },
          },
        },

        orderBy: [
          {
            fechaFin:
              "asc",
          },
          {
            nombre:
              "asc",
          },
        ],
      });

  const availablePromotions =
    promotions
      .filter(
        (promotion) => {
          const configuredProductCount =
            promotion
              ._count
              .productos;

          const availableProductCount =
            promotion
              .productos
              .length;

          const requiresProducts =
            [
              "PRODUCTO_GRATIS",
              "COMBO",
            ].includes(
              promotion.tipo,
            );

          return hasAvailablePromotionUses(
            promotion
              .maximoUsos,
            promotion
              .usosActuales,
          ) &&
          !(
            requiresProducts &&
            configuredProductCount ===
              0
          ) &&
          !(
            configuredProductCount > 0 &&
            availableProductCount === 0
          ) &&
          !(
            promotion.tipo ===
              "COMBO" &&
            configuredProductCount !==
              availableProductCount
          ) &&
          !(
            promotion.tipo ===
              "PRODUCTO_GRATIS" &&
            Math.floor(
              Number(
                promotion.valor,
              ),
            ) < 1
          ) &&
          (
            promotion
              .productos
              .length === 0 ||
            getPromotionApplicability(
              promotion,
            ).branchIds.size > 0
          );
        },
      )
      .map(
        (promotion) => {
          const applicability =
            getPromotionApplicability(
              promotion,
            );

          return {
            id:
              promotion.id,

            nombre:
              promotion.nombre,

            descripcion:
              promotion.descripcion,

            tipo:
              promotion.tipo,

            valor:
              Number(
                promotion.valor,
              ),

            consumoMinimo:
              Number(
                promotion
                  .consumoMinimo,
              ),

            acumulable:
              promotion.acumulable,

            fechaInicio:
              promotion
                .fechaInicio
                .toISOString(),

            fechaFin:
              promotion
                .fechaFin
                .toISOString(),

            sucursal:
              promotion.sucursal
                ? {
                    nombre:
                      promotion
                        .sucursal
                        .nombre,
                  }
                : null,

            sucursalesAplicables:
              applicability
                .branchNames,

            productos:
              promotion
                .productos
                .filter(
                  (relation) =>
                    applicability
                      .branchIds
                      .size === 0 ||
                    relation
                      .producto
                      .sucursales
                      .some(
                        (assignment) =>
                          applicability
                            .branchIds
                            .has(
                              assignment
                                .sucursalId,
                            ),
                      ),
                )
                .map(
                  (relation) =>
                    ({
                      nombre:
                        relation
                          .producto
                          .nombre,

                      categoria: {
                        nombre:
                          relation
                            .producto
                            .categoria
                            .nombre,
                      },
                    }),
                ),

            aplicacionAutomatica:
              true as const,

            sujetaACupo:
              promotion
                .maximoUsos !==
              null,
          };
        },
      );

  return {
    promociones:
      availablePromotions,

    total:
      availablePromotions
        .length,
  };
}
