import {
  Prisma,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

import type {
  AuditOptionsQuery,
  ListAuditsQuery,
} from "./audit.schema.js";

type AuditAuth = {
  usuarioId: string;
  rol: string;
};

const auditListSelect = {
  id: true,
  accion: true,
  modulo: true,
  entidad: true,
  entidadId: true,
  descripcion: true,
  direccionIp: true,
  createdAt: true,

  usuario: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      correo: true,

      rol: {
        select: {
          codigo: true,
          nombre: true,
        },
      },
    },
  },

  sucursal: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
    },
  },
} satisfies Prisma.AuditoriaSelect;

const auditDetailSelect = {
  ...auditListSelect,

  datosAnteriores:
    true,

  datosNuevos:
    true,

  userAgent:
    true,
} satisfies Prisma.AuditoriaSelect;

type AuditListRecord =
  Prisma.AuditoriaGetPayload<{
    select:
      typeof auditListSelect;
  }>;

type AuditDetailRecord =
  Prisma.AuditoriaGetPayload<{
    select:
      typeof auditDetailSelect;
  }>;

function getOperationalDate(): Date {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/Lima",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const year =
    parts.find(
      (part) =>
        part.type === "year",
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month",
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type === "day",
    )?.value;

  if (!year || !month || !day) {
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

function createLimaDateStart(
  dateText: string,
): Date {
  return new Date(
    `${dateText}T00:00:00-05:00`,
  );
}

function createNextLimaDate(
  dateText: string,
): Date {
  const date =
    createLimaDateStart(
      dateText,
    );

  return new Date(
    date.getTime() +
      24 * 60 * 60 * 1000,
  );
}

function fullName(
  user: {
    nombres: string;
    apellidos: string;
  },
): string {
  return `${user.nombres} ${user.apellidos}`.trim();
}

async function getAuthorizedBranches(
  auth: AuditAuth,
) {
  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    return prisma.sucursal.findMany({
      where: {
        deletedAt: null,
      },

      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true,
      },

      orderBy: {
        nombre: "asc",
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

          activo: true,

          fechaInicio: {
            lte:
              operationalDate,
          },

          OR: [
            {
              fechaFin: null,
            },
            {
              fechaFin: {
                gte:
                  operationalDate,
              },
            },
          ],
        },

        select: {
          sucursal: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              estado: true,
            },
          },
        },
      });

  return assignments
    .map(
      (assignment) =>
        assignment.sucursal,
    )
    .sort(
      (
        branchA,
        branchB,
      ) =>
        branchA.nombre.localeCompare(
          branchB.nombre,
          "es",
        ),
    );
}

function assertAuthorizedBranch(
  branches: Array<{
    id: string;
  }>,
  branchId: string,
): void {
  if (
    !branches.some(
      (branch) =>
        branch.id ===
        branchId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes autorización para consultar esa sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

function createAccessWhere(
  auth: AuditAuth,
  branchIds: string[],
): Prisma.AuditoriaWhereInput {
  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    return {};
  }

  return {
    sucursalId: {
      in:
        branchIds,
    },
  };
}

function mapAuditList(
  audit: AuditListRecord,
) {
  return {
    id:
      audit.id,

    accion:
      audit.accion,

    modulo:
      audit.modulo,

    entidad:
      audit.entidad,

    entidadId:
      audit.entidadId,

    descripcion:
      audit.descripcion,

    direccionIp:
      audit.direccionIp,

    createdAt:
      audit.createdAt
        .toISOString(),

    usuario:
      audit.usuario
        ? {
            id:
              audit.usuario.id,

            nombreCompleto:
              fullName(
                audit.usuario,
              ),

            correo:
              audit.usuario.correo,

            rol:
              audit.usuario.rol,
          }
        : null,

    sucursal:
      audit.sucursal,
  };
}

function mapAuditDetail(
  audit: AuditDetailRecord,
) {
  return {
    ...mapAuditList(
      audit,
    ),

    datosAnteriores:
      audit.datosAnteriores,

    datosNuevos:
      audit.datosNuevos,

    userAgent:
      audit.userAgent,
  };
}

export async function getAuditOptions(
  auth: AuditAuth,
  query: AuditOptionsQuery,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  if (query.sucursalId) {
    assertAuthorizedBranch(
      branches,
      query.sucursalId,
    );
  }

  const branchIds =
    query.sucursalId
      ? [query.sucursalId]
      : branches.map(
          (branch) =>
            branch.id,
        );

  const accessWhere =
    createAccessWhere(
      auth,
      branchIds,
    );

  const [
    moduleRecords,
    actionRecords,
    users,
  ] = await Promise.all([
    prisma.auditoria.findMany({
      where:
        accessWhere,

      distinct: [
        "modulo",
      ],

      select: {
        modulo: true,
      },

      orderBy: {
        modulo: "asc",
      },
    }),

    prisma.auditoria.findMany({
      where:
        accessWhere,

      distinct: [
        "accion",
      ],

      select: {
        accion: true,
      },

      orderBy: {
        accion: "asc",
      },
    }),

    prisma.usuario.findMany({
      where: {
        deletedAt:
          null,

        ...(auth.rol ===
        "ADMINISTRADOR_GENERAL"
          ? {}
          : {
              sucursales: {
                some: {
                  sucursalId: {
                    in:
                      branchIds,
                  },

                  activo:
                    true,
                },
              },
            }),
      },

      select: {
        id: true,
        nombres: true,
        apellidos: true,
        correo: true,
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
    }),
  ]);

  return {
    sucursales:
      branches,

    sucursalSeleccionadaId:
      query.sucursalId ??
      (
        branches.length === 1
          ? branches[0]?.id
          : null
      ),

    modulos:
      moduleRecords.map(
        (record) =>
          record.modulo,
      ),

    acciones:
      actionRecords.map(
        (record) =>
          record.accion,
      ),

    usuarios:
      users.map(
        (user) => ({
          id:
            user.id,

          nombreCompleto:
            fullName(user),

          correo:
            user.correo,
        }),
      ),
  };
}

export async function listAudits(
  auth: AuditAuth,
  query: ListAuditsQuery,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  if (query.sucursalId) {
    assertAuthorizedBranch(
      branches,
      query.sucursalId,
    );
  }

  const branchIds =
    query.sucursalId
      ? [query.sucursalId]
      : branches.map(
          (branch) =>
            branch.id,
        );

  const accessWhere =
    createAccessWhere(
      auth,
      branchIds,
    );

  const where:
    Prisma.AuditoriaWhereInput = {
      ...accessWhere,

      ...(query.sucursalId
        ? {
            sucursalId:
              query.sucursalId,
          }
        : {}),

      ...(query.usuarioId
        ? {
            usuarioId:
              query.usuarioId,
          }
        : {}),

      ...(query.modulo
        ? {
            modulo:
              query.modulo,
          }
        : {}),

      ...(query.accion
        ? {
            accion:
              query.accion,
          }
        : {}),

      ...(
        query.fechaDesde ||
        query.fechaHasta
          ? {
              createdAt: {
                ...(query.fechaDesde
                  ? {
                      gte:
                        createLimaDateStart(
                          query
                            .fechaDesde,
                        ),
                    }
                  : {}),

                ...(query.fechaHasta
                  ? {
                      lt:
                        createNextLimaDate(
                          query
                            .fechaHasta,
                        ),
                    }
                  : {}),
              },
            }
          : {}
      ),

      ...(query.search
        ? {
            OR: [
              {
                descripcion: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                modulo: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                accion: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                entidad: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                usuario: {
                  is: {
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
                    ],
                  },
                },
              },
              {
                sucursal: {
                  is: {
                    nombre: {
                      contains:
                        query.search,

                      mode:
                        "insensitive",
                    },
                  },
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
    total,
    audits,
  ] = await prisma.$transaction([
    prisma.auditoria.count({
      where,
    }),

    prisma.auditoria.findMany({
      where,

      skip,
      take:
        query.limit,

      orderBy: {
        createdAt:
          "desc",
      },

      select:
        auditListSelect,
    }),
  ]);

  return {
    auditorias:
      audits.map(
        mapAuditList,
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

export async function getAuditById(
  auth: AuditAuth,
  auditId: string,
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

  const accessWhere =
    createAccessWhere(
      auth,
      branchIds,
    );

  const audit =
    await prisma.auditoria
      .findFirst({
        where: {
          id:
            auditId,

          ...accessWhere,
        },

        select:
          auditDetailSelect,
      });

  if (!audit) {
    throw new AppError(
      404,
      "El registro de auditoría no existe o no puedes consultarlo.",
      "AUDITORIA_NO_ENCONTRADA",
    );
  }

  return mapAuditDetail(
    audit,
  );
}