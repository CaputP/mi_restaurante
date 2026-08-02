import {
  Prisma,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

import type {
  CreateBranchInput,
  CreateZoneInput,
  ListBranchesQuery,
  UpdateBranchInput,
  UpdateBranchStateInput,
  UpdateZoneInput,
  UpdateZoneStateInput,
} from "./branch.schema.js";

const branchListSelect = {
  id: true,
  codigo: true,
  nombre: true,
  razonSocial: true,
  ruc: true,
  direccion: true,
  telefono: true,
  correo: true,
  zonaHoraria: true,
  estado: true,
  createdAt: true,
  updatedAt: true,

  _count: {
    select: {
      zonas: true,
      usuarios: true,
      productos: true,
      reservas: true,
      pedidos: true,
      cajas: true,
      ventas: true,
      gastos: true,
    },
  },
} satisfies Prisma.SucursalSelect;

const branchDetailSelect = {
  ...branchListSelect,

  zonas: {
    where: {
      deletedAt: null,
    },

    orderBy: [
      {
        estado: "asc",
      },
      {
        nombre: "asc",
      },
    ],

    select: {
      id: true,
      nombre: true,
      descripcion: true,
      capacidadReferencial:
        true,
      estado: true,
      createdAt: true,
      updatedAt: true,

      _count: {
        select: {
          reservas: true,
          pedidos: true,
          bloqueosDisponibilidad:
            true,
        },
      },
    },
  },
} satisfies Prisma.SucursalSelect;

type BranchListRecord =
  Prisma.SucursalGetPayload<{
    select:
      typeof branchListSelect;
  }>;

type BranchDetailRecord =
  Prisma.SucursalGetPayload<{
    select:
      typeof branchDetailSelect;
  }>;

function mapBranchList(
  branch: BranchListRecord,
) {
  return {
    id:
      branch.id,

    codigo:
      branch.codigo,

    nombre:
      branch.nombre,

    razonSocial:
      branch.razonSocial,

    ruc:
      branch.ruc,

    direccion:
      branch.direccion,

    telefono:
      branch.telefono,

    correo:
      branch.correo,

    zonaHoraria:
      branch.zonaHoraria,

    estado:
      branch.estado,

    createdAt:
      branch.createdAt
        .toISOString(),

    updatedAt:
      branch.updatedAt
        .toISOString(),

    estadisticas: {
      zonas:
        branch._count.zonas,

      usuarios:
        branch._count.usuarios,

      productos:
        branch._count.productos,

      reservas:
        branch._count.reservas,

      pedidos:
        branch._count.pedidos,

      cajas:
        branch._count.cajas,

      ventas:
        branch._count.ventas,

      gastos:
        branch._count.gastos,
    },
  };
}

function mapBranchDetail(
  branch: BranchDetailRecord,
) {
  return {
    ...mapBranchList(
      branch,
    ),

    zonas:
      branch.zonas.map(
        (zone) => ({
          id:
            zone.id,

          nombre:
            zone.nombre,

          descripcion:
            zone.descripcion,

          capacidadReferencial:
            zone
              .capacidadReferencial,

          estado:
            zone.estado,

          createdAt:
            zone.createdAt
              .toISOString(),

          updatedAt:
            zone.updatedAt
              .toISOString(),

          estadisticas: {
            reservas:
              zone._count
                .reservas,

            pedidos:
              zone._count
                .pedidos,

            bloqueos:
              zone._count
                .bloqueosDisponibilidad,
          },
        }),
      ),
  };
}

async function assertBranchExists(
  branchId: string,
) {
  const branch =
    await prisma.sucursal
      .findFirst({
        where: {
          id:
            branchId,

          deletedAt:
            null,
        },

        select: {
          id: true,
          codigo: true,
          nombre: true,
          estado: true,
        },
      });

  if (!branch) {
    throw new AppError(
      404,
      "La sucursal no existe.",
      "SUCURSAL_NO_ENCONTRADA",
    );
  }

  return branch;
}

async function assertUniqueBranchData(
  input: {
    codigo?: string;
    ruc?: string | null;
    correo?: string | null;
  },
  excludedBranchId?: string,
) {
  const conditions:
    Prisma.SucursalWhereInput[] =
      [];

  if (input.codigo) {
    conditions.push({
      codigo: {
        equals:
          input.codigo,

        mode:
          "insensitive",
      },
    });
  }

  if (input.ruc) {
    conditions.push({
      ruc:
        input.ruc,
    });
  }

  if (input.correo) {
    conditions.push({
      correo: {
        equals:
          input.correo,

        mode:
          "insensitive",
      },
    });
  }

  if (
    conditions.length === 0
  ) {
    return;
  }

  const existingBranch =
    await prisma.sucursal
      .findFirst({
        where: {
          ...(excludedBranchId
            ? {
                id: {
                  not:
                    excludedBranchId,
                },
              }
            : {}),

          OR:
            conditions,
        },

        select: {
          id: true,
          codigo: true,
          ruc: true,
          correo: true,
        },
      });

  if (!existingBranch) {
    return;
  }

  if (
    input.codigo &&
    existingBranch.codigo
      .toLowerCase() ===
      input.codigo
        .toLowerCase()
  ) {
    throw new AppError(
      409,
      "Ya existe una sucursal con ese código.",
      "CODIGO_SUCURSAL_DUPLICADO",
    );
  }

  if (
    input.ruc &&
    existingBranch.ruc ===
      input.ruc
  ) {
    throw new AppError(
      409,
      "Ya existe una sucursal con ese RUC.",
      "RUC_SUCURSAL_DUPLICADO",
    );
  }

  throw new AppError(
    409,
    "Ya existe una sucursal con ese correo electrónico.",
    "CORREO_SUCURSAL_DUPLICADO",
  );
}

export async function listBranches(
  query: ListBranchesQuery,
) {
  const where:
    Prisma.SucursalWhereInput = {
      deletedAt:
        null,

      ...(query.estado !==
      "TODOS"
        ? {
            estado:
              query.estado,
          }
        : {}),

      ...(query.search
        ? {
            OR: [
              {
                codigo: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                nombre: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                razonSocial: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                ruc: {
                  contains:
                    query.search,
                },
              },
              {
                direccion: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
            ],
          }
        : {}),
    };

  const skip =
    (query.page - 1) *
    query.limit;

  const [
    total,
    branches,
  ] = await prisma.$transaction([
    prisma.sucursal.count({
      where,
    }),

    prisma.sucursal.findMany({
      where,

      skip,
      take:
        query.limit,

      orderBy: [
        {
          estado: "asc",
        },
        {
          nombre: "asc",
        },
      ],

      select:
        branchListSelect,
    }),
  ]);

  return {
    sucursales:
      branches.map(
        mapBranchList,
      ),

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

export async function getBranchById(
  branchId: string,
) {
  const branch =
    await prisma.sucursal
      .findFirst({
        where: {
          id:
            branchId,

          deletedAt:
            null,
        },

        select:
          branchDetailSelect,
      });

  if (!branch) {
    throw new AppError(
      404,
      "La sucursal no existe.",
      "SUCURSAL_NO_ENCONTRADA",
    );
  }

  return mapBranchDetail(
    branch,
  );
}

export async function createBranch(
  input: CreateBranchInput,
) {
  await assertUniqueBranchData({
    codigo:
      input.codigo,

    ruc:
      input.ruc,

    correo:
      input.correo,
  });

  const branch =
    await prisma.sucursal
      .create({
        data: {
          codigo:
            input.codigo,

          nombre:
            input.nombre,

          razonSocial:
            input.razonSocial,

          ruc:
            input.ruc,

          direccion:
            input.direccion,

          telefono:
            input.telefono,

          correo:
            input.correo,

          zonaHoraria:
            input.zonaHoraria,

          estado:
            input.estado,
        },

        select: {
          id: true,
        },
      });

  return getBranchById(
    branch.id,
  );
}

export async function updateBranch(
  branchId: string,
  input: UpdateBranchInput,
) {
  await assertBranchExists(
    branchId,
  );

  if (
    Object.keys(input).length ===
    0
  ) {
    throw new AppError(
      400,
      "No se enviaron campos para actualizar.",
      "SUCURSAL_SIN_CAMBIOS",
    );
  }

  await assertUniqueBranchData(
    {
      ...(input.ruc !==
      undefined
        ? {
            ruc:
              input.ruc,
          }
        : {}),

      ...(input.correo !==
      undefined
        ? {
            correo:
              input.correo,
          }
        : {}),
    },
    branchId,
  );

  await prisma.sucursal.update({
    where: {
      id:
        branchId,
    },

    data: {
      ...(input.nombre !==
      undefined
        ? {
            nombre:
              input.nombre,
          }
        : {}),

      ...(input.razonSocial !==
      undefined
        ? {
            razonSocial:
              input.razonSocial,
          }
        : {}),

      ...(input.ruc !==
      undefined
        ? {
            ruc:
              input.ruc,
          }
        : {}),

      ...(input.direccion !==
      undefined
        ? {
            direccion:
              input.direccion,
          }
        : {}),

      ...(input.telefono !==
      undefined
        ? {
            telefono:
              input.telefono,
          }
        : {}),

      ...(input.correo !==
      undefined
        ? {
            correo:
              input.correo,
          }
        : {}),

      ...(input.zonaHoraria !==
      undefined
        ? {
            zonaHoraria:
              input.zonaHoraria,
          }
        : {}),
    },
  });

  return getBranchById(
    branchId,
  );
}

export async function updateBranchState(
  branchId: string,
  input: UpdateBranchStateInput,
) {
  const branch =
    await assertBranchExists(
      branchId,
    );

  if (
    branch.estado ===
    input.estado
  ) {
    throw new AppError(
      409,
      `La sucursal ya se encuentra en estado ${input.estado}.`,
      "ESTADO_SUCURSAL_SIN_CAMBIOS",
    );
  }

  if (
    input.estado !==
    "ACTIVO"
  ) {
    const openCashCount =
      await prisma.caja.count({
        where: {
          sucursalId:
            branchId,

          estado:
            "ABIERTA",
        },
      });

    if (
      openCashCount > 0
    ) {
      throw new AppError(
        409,
        "No se puede desactivar o archivar una sucursal con cajas abiertas.",
        "SUCURSAL_CON_CAJAS_ABIERTAS",
      );
    }
  }

  await prisma.sucursal.update({
    where: {
      id:
        branchId,
    },

    data: {
      estado:
        input.estado,
    },
  });

  return getBranchById(
    branchId,
  );
}

async function assertUniqueZoneName(
  branchId: string,
  zoneName: string,
  excludedZoneId?: string,
) {
  const existingZone =
    await prisma.zona.findFirst({
      where: {
        sucursalId:
          branchId,

        deletedAt:
          null,

        nombre: {
          equals:
            zoneName,

          mode:
            "insensitive",
        },

        ...(excludedZoneId
          ? {
              id: {
                not:
                  excludedZoneId,
              },
            }
          : {}),
      },

      select: {
        id: true,
      },
    });

  if (existingZone) {
    throw new AppError(
      409,
      "Ya existe una zona con ese nombre en la sucursal.",
      "NOMBRE_ZONA_DUPLICADO",
    );
  }
}

async function assertZoneExists(
  branchId: string,
  zoneId: string,
) {
  const zone =
    await prisma.zona.findFirst({
      where: {
        id:
          zoneId,

        sucursalId:
          branchId,

        deletedAt:
          null,
      },

      select: {
        id: true,
        nombre: true,
        estado: true,
      },
    });

  if (!zone) {
    throw new AppError(
      404,
      "La zona no existe o no pertenece a la sucursal.",
      "ZONA_NO_ENCONTRADA",
    );
  }

  return zone;
}

export async function createZone(
  branchId: string,
  input: CreateZoneInput,
) {
  const branch =
    await assertBranchExists(
      branchId,
    );

  if (
    branch.estado ===
    "ARCHIVADO"
  ) {
    throw new AppError(
      409,
      "No se pueden agregar zonas a una sucursal archivada.",
      "SUCURSAL_ARCHIVADA",
    );
  }

  await assertUniqueZoneName(
    branchId,
    input.nombre,
  );

  await prisma.zona.create({
    data: {
      sucursalId:
        branchId,

      nombre:
        input.nombre,

      descripcion:
        input.descripcion,

      capacidadReferencial:
        input
          .capacidadReferencial,

      estado:
        input.estado,
    },
  });

  return getBranchById(
    branchId,
  );
}

export async function updateZone(
  branchId: string,
  zoneId: string,
  input: UpdateZoneInput,
) {
  await assertBranchExists(
    branchId,
  );

  await assertZoneExists(
    branchId,
    zoneId,
  );

  if (
    Object.keys(input).length ===
    0
  ) {
    throw new AppError(
      400,
      "No se enviaron campos para actualizar.",
      "ZONA_SIN_CAMBIOS",
    );
  }

  if (input.nombre) {
    await assertUniqueZoneName(
      branchId,
      input.nombre,
      zoneId,
    );
  }

  await prisma.zona.update({
    where: {
      id:
        zoneId,
    },

    data: {
      ...(input.nombre !==
      undefined
        ? {
            nombre:
              input.nombre,
          }
        : {}),

      ...(input.descripcion !==
      undefined
        ? {
            descripcion:
              input.descripcion,
          }
        : {}),

      ...(input.capacidadReferencial !==
      undefined
        ? {
            capacidadReferencial:
              input
                .capacidadReferencial,
          }
        : {}),
    },
  });

  return getBranchById(
    branchId,
  );
}

export async function updateZoneState(
  branchId: string,
  zoneId: string,
  input: UpdateZoneStateInput,
) {
  await assertBranchExists(
    branchId,
  );

  const zone =
    await assertZoneExists(
      branchId,
      zoneId,
    );

  if (
    zone.estado ===
    input.estado
  ) {
    throw new AppError(
      409,
      `La zona ya se encuentra en estado ${input.estado}.`,
      "ESTADO_ZONA_SIN_CAMBIOS",
    );
  }

  if (
    input.estado !==
    "ACTIVO"
  ) {
    const activeReservations =
      await prisma.reserva.count({
        where: {
          zonaId:
            zoneId,

          estado: {
            in: [
              "SOLICITADA",
              "EN_REVISION",
              "ESPERANDO_ADELANTO",
              "CONFIRMADA",
            ],
          },
        },
      });

    if (
      activeReservations > 0
    ) {
      throw new AppError(
        409,
        "No se puede desactivar o archivar una zona con reservas activas.",
        "ZONA_CON_RESERVAS_ACTIVAS",
      );
    }
  }

  await prisma.zona.update({
    where: {
      id:
        zoneId,
    },

    data: {
      estado:
        input.estado,
    },
  });

  return getBranchById(
    branchId,
  );
}