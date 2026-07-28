import { hash } from "bcryptjs";

import {
  Prisma,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

import type {
  CreateUserInput,
  ListUsersQuery,
  ResetUserPasswordInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from "./user.schema.js";

type UserManagementAuth = {
  usuarioId: string;
  rol: string;
};

const ROLES_GESTIONABLES_POR_SUCURSAL =
  [
    "VENDEDOR",
    "MOZO",
    "COCINA",
  ] as const;

const ROLES_CON_SUCURSAL =
  new Set([
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
    "MOZO",
    "COCINA",
  ]);

function getOperationalDate(): Date {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(new Date());

  const year = parts.find(
    (part) => part.type === "year",
  )?.value;

  const month = parts.find(
    (part) => part.type === "month",
  )?.value;

  const day = parts.find(
    (part) => part.type === "day",
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

async function getManagementScope(
  auth: UserManagementAuth,
) {
  const dateOnly =
    getOperationalDate();

  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    const [
      roles,
      branches,
    ] = await Promise.all([
      prisma.rol.findMany({
        where: {
          activo: true,
        },

        select: {
          id: true,
          codigo: true,
          nombre: true,
          descripcion: true,
        },

        orderBy: {
          nombre: "asc",
        },
      }),

      prisma.sucursal.findMany({
        where: {
          estado: "ACTIVO",
          deletedAt: null,
        },

        select: {
          id: true,
          codigo: true,
          nombre: true,
        },

        orderBy: {
          nombre: "asc",
        },
      }),
    ]);

    return {
      dateOnly,
      roles,
      branches,
      branchIds:
        branches.map(
          (branch) => branch.id,
        ),
    };
  }

  const [
    roles,
    assignments,
  ] = await Promise.all([
    prisma.rol.findMany({
      where: {
        activo: true,

        codigo: {
          in: [
            ...ROLES_GESTIONABLES_POR_SUCURSAL,
          ],
        },
      },

      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
      },

      orderBy: {
        nombre: "asc",
      },
    }),

    prisma.usuarioSucursal.findMany({
      where: {
        usuarioId:
          auth.usuarioId,

        activo: true,

        fechaInicio: {
          lte: dateOnly,
        },

        OR: [
          {
            fechaFin: null,
          },
          {
            fechaFin: {
              gte: dateOnly,
            },
          },
        ],

        sucursal: {
          estado: "ACTIVO",
          deletedAt: null,
        },
      },

      select: {
        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },

      orderBy: {
        sucursal: {
          nombre: "asc",
        },
      },
    }),
  ]);

  const branches =
    assignments.map(
      (assignment) =>
        assignment.sucursal,
    );

  return {
    dateOnly,
    roles,
    branches,
    branchIds:
      branches.map(
        (branch) => branch.id,
      ),
  };
}

function validateRole(
  scope: Awaited<
    ReturnType<
      typeof getManagementScope
    >
  >,
  roleId: string,
) {
  const role =
    scope.roles.find(
      (item) =>
        item.id === roleId,
    );

  if (!role) {
    throw new AppError(
      403,
      "No tienes autorización para asignar el rol seleccionado.",
      "ROL_NO_AUTORIZADO",
    );
  }

  return role;
}

function validateBranches(
  scope: Awaited<
    ReturnType<
      typeof getManagementScope
    >
  >,
  roleCode: string,
  branchIds: string[],
): void {
  const requiresBranch =
    ROLES_CON_SUCURSAL.has(
      roleCode,
    );

  if (
    requiresBranch &&
    branchIds.length === 0
  ) {
    throw new AppError(
      400,
      "El rol seleccionado requiere al menos una sucursal.",
      "SUCURSAL_REQUERIDA",
    );
  }

  if (
    !requiresBranch &&
    branchIds.length > 0
  ) {
    throw new AppError(
      400,
      "El rol seleccionado no debe tener sucursales asignadas.",
      "SUCURSAL_NO_PERMITIDA",
    );
  }

  const invalidBranch =
    branchIds.find(
      (branchId) =>
        !scope.branchIds.includes(
          branchId,
        ),
    );

  if (invalidBranch) {
    throw new AppError(
      403,
      "No tienes autorización para administrar una de las sucursales seleccionadas.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

async function getManagedUser(
  auth: UserManagementAuth,
  userId: string,
  scope: Awaited<
    ReturnType<
      typeof getManagementScope
    >
  >,
) {
  const user =
    await prisma.usuario.findFirst({
      where: {
        id: userId,
        deletedAt: null,

        ...(auth.rol ===
        "ADMINISTRADOR_SUCURSAL"
          ? {
              rol: {
                codigo: {
                  in: [
                    ...ROLES_GESTIONABLES_POR_SUCURSAL,
                  ],
                },
              },

              sucursales: {
                some: {
                  sucursalId: {
                    in: scope.branchIds,
                  },

                  activo: true,

                  fechaInicio: {
                    lte: scope.dateOnly,
                  },

                  OR: [
                    {
                      fechaFin: null,
                    },
                    {
                      fechaFin: {
                        gte:
                          scope.dateOnly,
                      },
                    },
                  ],
                },
              },
            }
          : {}),
      },

      select: {
        id: true,
        nombres: true,
        apellidos: true,
        correo: true,
        telefono: true,
        proveedorAuth: true,
        estado: true,
        sessionVersion: true,

        rol: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },

        sucursales: {
          select: {
            id: true,
            sucursalId: true,
            activo: true,
            fechaInicio: true,
            fechaFin: true,
          },
        },
      },
    });

  if (!user) {
    throw new AppError(
      404,
      "El usuario no existe o no puedes administrarlo.",
      "USUARIO_NO_ENCONTRADO",
    );
  }

  return user;
}

async function ensureAnotherGeneralAdministrator(
  excludedUserId: string,
): Promise<void> {
  const remainingAdministrators =
    await prisma.usuario.count({
      where: {
        id: {
          not: excludedUserId,
        },

        estado: "ACTIVO",
        deletedAt: null,

        rol: {
          codigo:
            "ADMINISTRADOR_GENERAL",
        },
      },
    });

  if (
    remainingAdministrators === 0
  ) {
    throw new AppError(
      409,
      "El sistema debe conservar al menos un administrador general activo.",
      "ULTIMO_ADMINISTRADOR_GENERAL",
    );
  }
}

async function syncBranchAssignments(
  transaction:
    Prisma.TransactionClient,

  userId: string,
  desiredBranchIds: string[],
  dateOnly: Date,
): Promise<void> {
  const assignments =
    await transaction
      .usuarioSucursal
      .findMany({
        where: {
          usuarioId: userId,
        },
      });

  const desiredIds =
    new Set(desiredBranchIds);

  for (
    const assignment
    of assignments
  ) {
    const shouldBeActive =
      desiredIds.has(
        assignment.sucursalId,
      );

    if (
      shouldBeActive &&
      !assignment.activo
    ) {
      await transaction
        .usuarioSucursal
        .update({
          where: {
            id: assignment.id,
          },

          data: {
            activo: true,
            fechaInicio:
              dateOnly,
            fechaFin: null,
          },
        });
    }

    if (
      !shouldBeActive &&
      assignment.activo
    ) {
      await transaction
        .usuarioSucursal
        .update({
          where: {
            id: assignment.id,
          },

          data: {
            activo: false,
            fechaFin:
              dateOnly,
          },
        });
    }

    desiredIds.delete(
      assignment.sucursalId,
    );
  }

  if (
    desiredIds.size > 0
  ) {
    await transaction
      .usuarioSucursal
      .createMany({
        data: Array.from(
          desiredIds,
        ).map(
          (branchId) => ({
            usuarioId: userId,
            sucursalId:
              branchId,
            activo: true,
            fechaInicio:
              dateOnly,
          }),
        ),
      });
  }
}

function formatUser(user: {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string | null;
  proveedorAuth: string;
  estado: string;
  correoVerificado: boolean;
  ultimoAcceso: Date | null;
  createdAt: Date;

  rol: {
    id: string;
    codigo: string;
    nombre: string;
  };

  sucursales: Array<{
    fechaInicio: Date;
    fechaFin: Date | null;

    sucursal: {
      id: string;
      codigo: string;
      nombre: string;
    };
  }>;
}) {
  return {
    id: user.id,
    nombres: user.nombres,
    apellidos: user.apellidos,

    nombreCompleto:
      `${user.nombres} ${user.apellidos}`.trim(),

    correo: user.correo,
    telefono: user.telefono,

    proveedorAuth:
      user.proveedorAuth,

    estado: user.estado,

    correoVerificado:
      user.correoVerificado,

    ultimoAcceso:
      user.ultimoAcceso
        ?.toISOString() ??
      null,

    createdAt:
      user.createdAt
        .toISOString(),

    rol: user.rol,

    sucursales:
      user.sucursales.map(
        (assignment) => ({
          ...assignment.sucursal,

          fechaInicio:
            assignment
              .fechaInicio
              .toISOString()
              .slice(0, 10),

          fechaFin:
            assignment.fechaFin
              ?.toISOString()
              .slice(0, 10) ??
            null,
        }),
      ),
  };
}

export async function getUserOptions(
  auth: UserManagementAuth,
) {
  const scope =
    await getManagementScope(auth);

  return {
    roles: scope.roles,
    sucursales:
      scope.branches,

    estados: [
      {
        codigo: "ACTIVO",
        nombre: "Activo",
      },
      {
        codigo: "INACTIVO",
        nombre: "Inactivo",
      },
      {
        codigo: "BLOQUEADO",
        nombre: "Bloqueado",
      },
    ],
  };
}

export async function listUsers(
  auth: UserManagementAuth,
  query: ListUsersQuery,
) {
  const scope =
    await getManagementScope(auth);

  if (
    query.sucursalId &&
    !scope.branchIds.includes(
      query.sucursalId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes autorización para consultar esa sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }

  if (
    query.rolId &&
    !scope.roles.some(
      (role) =>
        role.id === query.rolId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes autorización para consultar el rol seleccionado.",
      "ROL_NO_AUTORIZADO",
    );
  }

  const assignmentFilter = {
    activo: true,

    fechaInicio: {
      lte: scope.dateOnly,
    },

    OR: [
      {
        fechaFin: null,
      },
      {
        fechaFin: {
          gte:
            scope.dateOnly,
        },
      },
    ],
  };

  const where:
    Prisma.UsuarioWhereInput = {
      deletedAt: null,

      ...(query.estado !==
      "TODOS"
        ? {
            estado:
              query.estado,
          }
        : {}),

      ...(query.rolId
        ? {
            rolId:
              query.rolId,
          }
        : {}),

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
                  mode:
                    "insensitive",
                },
              },
            ],
          }
        : {}),

      ...(query.sucursalId
        ? {
            sucursales: {
              some: {
                ...assignmentFilter,

                sucursalId:
                  query.sucursalId,
              },
            },
          }
        : auth.rol ===
          "ADMINISTRADOR_SUCURSAL"
        ? {
            rol: {
              codigo: {
                in: [
                  ...ROLES_GESTIONABLES_POR_SUCURSAL,
                ],
              },
            },

            sucursales: {
              some: {
                ...assignmentFilter,

                sucursalId: {
                  in:
                    scope.branchIds,
                },
              },
            },
          }
        : {}),
    };

  const skip =
    (query.page - 1) *
    query.limit;

  const [
    total,
    users,
  ] = await prisma.$transaction([
    prisma.usuario.count({
      where,
    }),

    prisma.usuario.findMany({
      where,

      skip,
      take: query.limit,

      orderBy: [
        {
          apellidos: "asc",
        },
        {
          nombres: "asc",
        },
      ],

      select: {
        id: true,
        nombres: true,
        apellidos: true,
        correo: true,
        telefono: true,
        proveedorAuth: true,
        estado: true,
        correoVerificado: true,
        ultimoAcceso: true,
        createdAt: true,

        rol: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },

        sucursales: {
          where: {
            ...assignmentFilter,

            ...(auth.rol ===
            "ADMINISTRADOR_SUCURSAL"
              ? {
                  sucursalId: {
                    in:
                      scope.branchIds,
                  },
                }
              : {}),
          },

          select: {
            fechaInicio: true,
            fechaFin: true,

            sucursal: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
              },
            },
          },

          orderBy: {
            sucursal: {
              nombre: "asc",
            },
          },
        },
      },
    }),
  ]);

  return {
    usuarios:
      users.map(formatUser),

    pagination: {
      page: query.page,
      limit: query.limit,
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

export async function createUser(
  auth: UserManagementAuth,
  input: CreateUserInput,
) {
  const scope =
    await getManagementScope(auth);

  const role =
    validateRole(
      scope,
      input.rolId,
    );

  validateBranches(
    scope,
    role.codigo,
    input.sucursalIds,
  );

  const email =
    input.correo
      .trim()
      .toLowerCase();

  const existingUser =
    await prisma.usuario.findUnique({
      where: {
        correo: email,
      },

      select: {
        id: true,
      },
    });

  if (existingUser) {
    throw new AppError(
      409,
      "Ya existe un usuario con ese correo.",
      "CORREO_YA_REGISTRADO",
    );
  }

  const passwordHash =
    await hash(
      input.password,
      12,
    );

  try {
    const user =
      await prisma.$transaction(
        async (transaction) => {
          const createdUser =
            await transaction
              .usuario
              .create({
                data: {
                  rolId: role.id,

                  nombres:
                    input.nombres,

                  apellidos:
                    input.apellidos,

                  telefono:
                    input.telefono,

                  correo: email,

                  passwordHash,

                  proveedorAuth:
                    "LOCAL",

                  estado:
                    "ACTIVO",

                  correoVerificado:
                    false,
                },
              });

          await syncBranchAssignments(
            transaction,
            createdUser.id,
            input.sucursalIds,
            scope.dateOnly,
          );

          return createdUser;
        },
      );

    return {
      id: user.id,
      nombres: user.nombres,
      apellidos:
        user.apellidos,

      nombreCompleto:
        `${user.nombres} ${user.apellidos}`.trim(),

      correo: user.correo,
      rol: role,
    };
  } catch (error: unknown) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "Ya existe un usuario con ese correo.",
        "CORREO_YA_REGISTRADO",
      );
    }

    throw error;
  }
}

export async function updateUser(
  auth: UserManagementAuth,
  userId: string,
  input: UpdateUserInput,
) {
  const scope =
    await getManagementScope(auth);

  const currentUser =
    await getManagedUser(
      auth,
      userId,
      scope,
    );

  const role =
    validateRole(
      scope,
      input.rolId,
    );

  validateBranches(
    scope,
    role.codigo,
    input.sucursalIds,
  );

  const roleChanged =
    currentUser.rol.id !==
    role.id;

  if (
    userId ===
      auth.usuarioId &&
    roleChanged
  ) {
    throw new AppError(
      409,
      "No puedes modificar tu propio rol desde este módulo.",
      "ROL_PROPIO_NO_MODIFICABLE",
    );
  }

  if (
    currentUser.rol.codigo ===
      "ADMINISTRADOR_GENERAL" &&
    role.codigo !==
      "ADMINISTRADOR_GENERAL" &&
    currentUser.estado ===
      "ACTIVO"
  ) {
    await ensureAnotherGeneralAdministrator(
      userId,
    );
  }

  await prisma.$transaction(
    async (transaction) => {
      await transaction
        .usuario
        .update({
          where: {
            id: userId,
          },

          data: {
            nombres:
              input.nombres,

            apellidos:
              input.apellidos,

            telefono:
              input.telefono,

            rolId:
              role.id,

            ...(roleChanged
              ? {
                  sessionVersion: {
                    increment: 1,
                  },
                }
              : {}),
          },
        });

      await syncBranchAssignments(
        transaction,
        userId,
        input.sucursalIds,
        scope.dateOnly,
      );
    },
  );

  return {
    id: userId,
    nombres: input.nombres,
    apellidos:
      input.apellidos,

    nombreCompleto:
      `${input.nombres} ${input.apellidos}`.trim(),

    correo:
      currentUser.correo,

    telefono:
      input.telefono,

    rol: role,
    sucursalIds:
      input.sucursalIds,
  };
}

export async function updateUserStatus(
  auth: UserManagementAuth,
  userId: string,
  input: UpdateUserStatusInput,
) {
  const scope =
    await getManagementScope(auth);

  const user =
    await getManagedUser(
      auth,
      userId,
      scope,
    );

  if (
    userId ===
    auth.usuarioId
  ) {
    throw new AppError(
      409,
      "No puedes cambiar el estado de tu propia cuenta.",
      "ESTADO_PROPIO_NO_MODIFICABLE",
    );
  }

  if (
    user.rol.codigo ===
      "ADMINISTRADOR_GENERAL" &&
    user.estado ===
      "ACTIVO" &&
    input.estado !==
      "ACTIVO"
  ) {
    await ensureAnotherGeneralAdministrator(
      userId,
    );
  }

  if (
    user.estado ===
    input.estado
  ) {
    return {
      id: user.id,
      estado:
        user.estado,
    };
  }

  const updatedUser =
    await prisma.usuario.update({
      where: {
        id: userId,
      },

      data: {
        estado:
          input.estado,

        sessionVersion: {
          increment: 1,
        },
      },

      select: {
        id: true,
        estado: true,
      },
    });

  return updatedUser;
}

export async function resetUserPassword(
  auth: UserManagementAuth,
  userId: string,
  input: ResetUserPasswordInput,
) {
  const scope =
    await getManagementScope(auth);

  const user =
    await getManagedUser(
      auth,
      userId,
      scope,
    );

  if (
    userId ===
    auth.usuarioId
  ) {
    throw new AppError(
      409,
      "Utiliza tu perfil o la recuperación de contraseña para cambiar tu propia clave.",
      "PASSWORD_PROPIO_NO_MODIFICABLE",
    );
  }

  const passwordHash =
    await hash(
      input.password,
      12,
    );

  await prisma.$transaction(
    async (transaction) => {
      await transaction
        .usuario
        .update({
          where: {
            id: userId,
          },

          data: {
            passwordHash,

            proveedorAuth:
              user.proveedorAuth ===
              "GOOGLE"
                ? "AMBOS"
                : user.proveedorAuth,

            sessionVersion: {
              increment: 1,
            },
          },
        });

      await transaction
        .tokenRecuperacionPassword
        .deleteMany({
          where: {
            usuarioId: userId,
          },
        });
    },
  );

  return {
    id: user.id,
    correo:
      user.correo,
  };
}