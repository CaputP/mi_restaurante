import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  prisma,
} from "../../lib/prisma.js";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import type {
  LoyaltyCustomerListQuery,
} from "./loyalty-customer.schema.js";

type LoyaltyCustomerAuth = {
  usuarioId: string;
  rol: string;
};

function getOperationalDate(): Date {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/Lima",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    ).formatToParts(
      new Date(),
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

  return new Date(
    `${year}-${month}-${day}T00:00:00.000Z`,
  );
}

function getFullName(
  customer: {
    nombres: string;
    apellidos: string;
  },
): string {
  return [
    customer.nombres,
    customer.apellidos,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getEffectiveRewardState(
  reward: {
    estado:
      | "DISPONIBLE"
      | "CANJEADO"
      | "VENCIDO"
      | "ANULADO";

    fechaVencimiento:
      Date;
  },
) {
  if (
    reward.estado ===
      "DISPONIBLE" &&
    reward.fechaVencimiento <
      new Date()
  ) {
    return "VENCIDO";
  }

  return reward.estado;
}

async function getAuthorizedBranches(
  auth: LoyaltyCustomerAuth,
) {
  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    return prisma.sucursal
      .findMany({
        where: {
          deletedAt:
            null,

          estado: {
            not:
              "ARCHIVADO",
          },
        },

        select: {
          id:
            true,

          codigo:
            true,

          nombre:
            true,
        },

        orderBy: {
          nombre:
            "asc",
        },
      });
  }

  const operationalDate =
    getOperationalDate();

  const assignments =
    await prisma
      .usuarioSucursal
      .findMany({
        where: {
          usuarioId:
            auth.usuarioId,

          activo:
            true,

          fechaInicio: {
            lte:
              operationalDate,
          },

          OR: [
            {
              fechaFin:
                null,
            },
            {
              fechaFin: {
                gte:
                  operationalDate,
              },
            },
          ],

          sucursal: {
            deletedAt:
              null,

            estado: {
              not:
                "ARCHIVADO",
            },
          },
        },

        select: {
          sucursal: {
            select: {
              id:
                true,

              codigo:
                true,

              nombre:
                true,
            },
          },
        },
      });

  return assignments.map(
    (assignment) =>
      assignment.sucursal,
  );
}

function buildVisibleProgramWhere(
  auth: LoyaltyCustomerAuth,
  branchIds: string[],
  selectedBranchId?: string | null,
): Prisma.ProgramaFidelizacionWhereInput {
  if (selectedBranchId) {
    return {
      OR: [
        {
          sucursalId:
            null,
        },
        {
          sucursalId:
            selectedBranchId,
        },
      ],
    };
  }

  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    return {};
  }

  return {
    OR: [
      {
        sucursalId:
          null,
      },
      {
        sucursalId: {
          in:
            branchIds,
        },
      },
    ],
  };
}

async function validateSelectedBranch(
  auth: LoyaltyCustomerAuth,
  branchIds: string[],
  selectedBranchId?: string | null,
): Promise<void> {
  if (!selectedBranchId) {
    return;
  }

  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    const branch =
      await prisma.sucursal
        .findFirst({
          where: {
            id:
              selectedBranchId,

            deletedAt:
              null,

            estado: {
              not:
                "ARCHIVADO",
            },
          },

          select: {
            id:
              true,
          },
        });

    if (!branch) {
      throw new AppError(
        400,
        "La sucursal seleccionada no existe.",
        "SUCURSAL_INVALIDA",
      );
    }

    return;
  }

  if (
    !branchIds.includes(
      selectedBranchId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes acceso a la sucursal seleccionada.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

export async function listLoyaltyCustomers(
  auth: LoyaltyCustomerAuth,
  query: LoyaltyCustomerListQuery,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  const branchIds =
    branches.map(
      (branch) =>
        branch.id,
    );

  await validateSelectedBranch(
    auth,
    branchIds,
    query.sucursalId,
  );

  const programWhere =
    buildVisibleProgramWhere(
      auth,
      branchIds,
      query.sucursalId,
    );

  const where:
    Prisma.UsuarioWhereInput = {
      deletedAt:
        null,

      progresosFidelizacion: {
        some: {
          programa:
            programWhere,
        },
      },

      ...(query.search
        ? {
            OR: [
              {
                nombres: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                apellidos: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                correo: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                telefono: {
                  contains:
                    query.search,
                },
              },
            ],
          }
        : {}),
    };

  const skip =
    (
      query.page -
      1
    ) *
    query.limit;

  const [
    customers,
    total,
  ] =
    await Promise.all([
      prisma.usuario
        .findMany({
          where,

          select: {
            id:
              true,

            nombres:
              true,

            apellidos:
              true,

            correo:
              true,

            telefono:
              true,

            estado:
              true,

            progresosFidelizacion: {
              where: {
                programa:
                  programWhere,
              },

              select: {
                id:
                  true,

                visitasAcumuladas:
                  true,

                montoAcumulado:
                  true,

                ciclosCompletados:
                  true,

                updatedAt:
                  true,

                programa: {
                  select: {
                    id:
                      true,

                    nombre:
                      true,

                    tipo:
                      true,

                    activo:
                      true,

                    sucursal: {
                      select: {
                        id:
                          true,

                        nombre:
                          true,
                      },
                    },
                  },
                },
              },
            },

            premiosObtenidos: {
              where: {
                programa:
                  programWhere,
              },

              select: {
                id:
                  true,

                estado:
                  true,

                fechaVencimiento:
                  true,
              },
            },
          },

          orderBy: [
            {
              apellidos:
                "asc",
            },
            {
              nombres:
                "asc",
            },
          ],

          skip,

          take:
            query.limit,
        }),

      prisma.usuario.count({
        where,
      }),
    ]);

  const mappedCustomers =
    customers.map(
      (customer) => {
        const rewardStates =
          customer
            .premiosObtenidos
            .map(
              getEffectiveRewardState,
            );

        return {
          id:
            customer.id,

          nombres:
            customer.nombres,

          apellidos:
            customer.apellidos,

          nombreCompleto:
            getFullName(
              customer,
            ),

          correo:
            customer.correo,

          telefono:
            customer.telefono,

          estado:
            customer.estado,

          cantidadProgramas:
            customer
              .progresosFidelizacion
              .length,

          visitasAcumuladas:
            customer
              .progresosFidelizacion
              .reduce(
                (
                  totalVisits,
                  progress,
                ) =>
                  totalVisits +
                  progress
                    .visitasAcumuladas,
                0,
              ),

          montoAcumulado:
            customer
              .progresosFidelizacion
              .reduce(
                (
                  totalAmount,
                  progress,
                ) =>
                  totalAmount.plus(
                    progress
                      .montoAcumulado,
                  ),
                new Prisma.Decimal(
                  0,
                ),
              )
              .toString(),

          premiosDisponibles:
            rewardStates.filter(
              (state) =>
                state ===
                "DISPONIBLE",
            ).length,

          premiosCanjeados:
            rewardStates.filter(
              (state) =>
                state ===
                "CANJEADO",
            ).length,

          premiosVencidos:
            rewardStates.filter(
              (state) =>
                state ===
                "VENCIDO",
            ).length,

          ultimaActualizacion:
            customer
              .progresosFidelizacion
              .reduce<Date | null>(
                (
                  latest,
                  progress,
                ) => {
                  if (
                    !latest ||
                    progress.updatedAt >
                      latest
                  ) {
                    return progress
                      .updatedAt;
                  }

                  return latest;
                },
                null,
              )
              ?.toISOString() ??
            null,
        };
      },
    );

  return {
    clientes:
      mappedCustomers,

    sucursales:
      branches,

    pagination: {
      page:
        query.page,

      limit:
        query.limit,

      total,

      totalPages:
        Math.max(
          1,
          Math.ceil(
            total /
              query.limit,
          ),
        ),
    },
  };
}

export async function getLoyaltyCustomerById(
  auth: LoyaltyCustomerAuth,
  customerId: string,
  selectedBranchId?: string | null,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  const branchIds =
    branches.map(
      (branch) =>
        branch.id,
    );

  await validateSelectedBranch(
    auth,
    branchIds,
    selectedBranchId,
  );

  const programWhere =
    buildVisibleProgramWhere(
      auth,
      branchIds,
      selectedBranchId,
    );

  const customer =
    await prisma.usuario
      .findFirst({
        where: {
          id:
            customerId,

          deletedAt:
            null,

          progresosFidelizacion: {
            some: {
              programa:
                programWhere,
            },
          },
        },

        select: {
          id:
            true,

          nombres:
            true,

          apellidos:
            true,

          correo:
            true,

          telefono:
            true,

          estado:
            true,

          progresosFidelizacion: {
            where: {
              programa:
                programWhere,
            },

            select: {
              id:
                true,

              visitasAcumuladas:
                true,

              montoAcumulado:
                true,

              ciclosCompletados:
                true,

              createdAt:
                true,

              updatedAt:
                true,

              programa: {
                select: {
                  id:
                    true,

                  nombre:
                    true,

                  descripcion:
                    true,

                  tipo:
                    true,

                  visitasRequeridas:
                    true,

                  montoRequerido:
                    true,

                  tipoRecompensa:
                    true,

                  vigenciaDiasPremio:
                    true,

                  activo:
                    true,

                  fechaInicio:
                    true,

                  fechaFin:
                    true,

                  sucursal: {
                    select: {
                      id:
                        true,

                      nombre:
                        true,
                    },
                  },
                },
              },
            },

            orderBy: {
              updatedAt:
                "desc",
            },
          },

          premiosObtenidos: {
            where: {
              programa:
                programWhere,
            },

            select: {
              id:
                true,

              descripcion:
                true,

              cantidadProducto:
                true,

              valorReferencia:
                true,

              estado:
                true,

              fechaObtencion:
                true,

              fechaVencimiento:
                true,

              fechaCanje:
                true,

              motivoAnulacion:
                true,

              programa: {
                select: {
                  id:
                    true,

                  nombre:
                    true,

                  tipoRecompensa:
                    true,
                },
              },

              productoPremio: {
                select: {
                  id:
                    true,

                  codigo:
                    true,

                  nombre:
                    true,
                },
              },

              ventaCanje: {
                select: {
                  id:
                    true,

                  numeroTicket:
                    true,
                },
              },

              canjeadoPor: {
                select: {
                  id:
                    true,

                  nombres:
                    true,

                  apellidos:
                    true,
                },
              },
            },

            orderBy: {
              fechaObtencion:
                "desc",
            },
          },
        },
      });

  if (!customer) {
    throw new AppError(
      404,
      "El cliente no existe o no tiene progreso visible.",
      "CLIENTE_FIDELIZACION_NO_ENCONTRADO",
    );
  }

  const rewards =
    customer
      .premiosObtenidos
      .map(
        (reward) => ({
          id:
            reward.id,

          descripcion:
            reward.descripcion,

          cantidadProducto:
            reward
              .cantidadProducto
              ?.toString() ??
            null,

          valorReferencia:
            reward
              .valorReferencia
              ?.toString() ??
            null,

          estado:
            reward.estado,

          estadoEfectivo:
            getEffectiveRewardState(
              reward,
            ),

          fechaObtencion:
            reward.fechaObtencion
              .toISOString(),

          fechaVencimiento:
            reward.fechaVencimiento
              .toISOString(),

          fechaCanje:
            reward.fechaCanje
              ?.toISOString() ??
            null,

          motivoAnulacion:
            reward
              .motivoAnulacion,

          programa:
            reward.programa,

          productoPremio:
            reward
              .productoPremio,

          ventaCanje:
            reward.ventaCanje,

          canjeadoPor:
            reward.canjeadoPor
              ? {
                  id:
                    reward
                      .canjeadoPor
                      .id,

                  nombreCompleto:
                    getFullName(
                      reward
                        .canjeadoPor,
                    ),
                }
              : null,
        }),
      );

  return {
    id:
      customer.id,

    nombres:
      customer.nombres,

    apellidos:
      customer.apellidos,

    nombreCompleto:
      getFullName(
        customer,
      ),

    correo:
      customer.correo,

    telefono:
      customer.telefono,

    estado:
      customer.estado,

    progresos:
      customer
        .progresosFidelizacion
        .map(
          (progress) => ({
            id:
              progress.id,

            visitasAcumuladas:
              progress
                .visitasAcumuladas,

            montoAcumulado:
              progress
                .montoAcumulado
                .toString(),

            ciclosCompletados:
              progress
                .ciclosCompletados,

            createdAt:
              progress.createdAt
                .toISOString(),

            updatedAt:
              progress.updatedAt
                .toISOString(),

            programa: {
              ...progress.programa,

              montoRequerido:
                progress
                  .programa
                  .montoRequerido
                  ?.toString() ??
                null,

              fechaInicio:
                progress
                  .programa
                  .fechaInicio
                  .toISOString()
                  .slice(
                    0,
                    10,
                  ),

              fechaFin:
                progress
                  .programa
                  .fechaFin
                  ?.toISOString()
                  .slice(
                    0,
                    10,
                  ) ??
                null,
            },
          }),
        ),

    premios:
      rewards,

    resumen: {
      cantidadProgramas:
        customer
          .progresosFidelizacion
          .length,

      premiosDisponibles:
        rewards.filter(
          (reward) =>
            reward.estadoEfectivo ===
            "DISPONIBLE",
        ).length,

      premiosCanjeados:
        rewards.filter(
          (reward) =>
            reward.estadoEfectivo ===
            "CANJEADO",
        ).length,

      premiosVencidos:
        rewards.filter(
          (reward) =>
            reward.estadoEfectivo ===
            "VENCIDO",
        ).length,

      premiosAnulados:
        rewards.filter(
          (reward) =>
            reward.estadoEfectivo ===
            "ANULADO",
        ).length,
    },
  };
}