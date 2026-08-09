import { prisma } from "../../lib/prisma.js";
import { withSerializableTransaction } from "../../lib/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import { reauthenticateUser } from "../../shared/security/reauthentication.js";

import type {
  UpdateRolePermissionsInput,
} from "./role.schema.js";

const protectedPermissionCodes =
  new Set([
    "ROL_GESTIONAR",
    "RESPALDO_GESTIONAR",
  ]);

export async function listRolesAndPermissions() {
  const [roles, permissions] =
    await prisma.$transaction([
      prisma.rol.findMany({
        where: {
          activo: true,
        },
        orderBy: {
          nombre: "asc",
        },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          descripcion: true,
          _count: {
            select: {
              usuarios: true,
            },
          },
          permisos: {
            where: {
              permiso: {
                activo: true,
              },
            },
            select: {
              permisoId: true,
            },
          },
        },
      }),
      prisma.permiso.findMany({
        where: {
          activo: true,
        },
        orderBy: [
          {
            modulo: "asc",
          },
          {
            nombre: "asc",
          },
        ],
        select: {
          id: true,
          codigo: true,
          nombre: true,
          descripcion: true,
          modulo: true,
        },
      }),
    ]);

  return {
    roles: roles.map(
      ({
        _count,
        permisos,
        ...role
      }) => ({
        ...role,
        usuariosAsignados:
          _count.usuarios,
        editable:
          role.codigo !==
          "ADMINISTRADOR_GENERAL",
        permisoIds:
          permisos.map(
            ({ permisoId }) =>
              permisoId,
          ),
      }),
    ),
    permisos: permissions,
  };
}

export async function updateRolePermissions(
  actorUserId: string,
  roleId: string,
  input: UpdateRolePermissionsInput,
) {
  await reauthenticateUser(
    actorUserId,
    input.password,
  );

  return withSerializableTransaction(
    async (transaction) => {
      const role =
        await transaction.rol.findUnique({
          where: {
            id: roleId,
          },
          select: {
            id: true,
            codigo: true,
            nombre: true,
            activo: true,
          },
        });

      if (!role || !role.activo) {
        throw new AppError(
          404,
          "El rol no existe o está inactivo.",
          "ROL_NO_ENCONTRADO",
        );
      }

      if (
        role.codigo ===
        "ADMINISTRADOR_GENERAL"
      ) {
        throw new AppError(
          409,
          "Los permisos del administrador general están protegidos para evitar un bloqueo total del sistema.",
          "ROL_PROTEGIDO",
        );
      }

      const permissions =
        await transaction.permiso.findMany({
          where: {
            id: {
              in: input.permisoIds,
            },
            activo: true,
          },
          select: {
            id: true,
            codigo: true,
          },
        });

      if (
        permissions.length !==
        input.permisoIds.length
      ) {
        throw new AppError(
          400,
          "Uno o más permisos no existen o están inactivos.",
          "PERMISOS_INVALIDOS",
        );
      }

      if (
        permissions.some(
          ({ codigo }) =>
            protectedPermissionCodes.has(
              codigo,
            ),
        )
      ) {
        throw new AppError(
          403,
          "Los permisos de roles y respaldos solo pertenecen al administrador general protegido.",
          "PERMISOS_PROTEGIDOS",
        );
      }

      await transaction.rolPermiso.deleteMany({
        where: {
          rolId: role.id,
        },
      });

      if (permissions.length > 0) {
        await transaction.rolPermiso.createMany({
          data: permissions.map(
            ({ id }) => ({
              rolId: role.id,
              permisoId: id,
            }),
          ),
        });
      }

      const invalidated =
        await transaction.usuario.updateMany({
          where: {
            rolId: role.id,
          },
          data: {
            sessionVersion: {
              increment: 1,
            },
          },
        });

      return {
        id: role.id,
        codigo: role.codigo,
        nombre: role.nombre,
        permisoIds:
          permissions.map(
            ({ id }) => id,
          ),
        sesionesInvalidadas:
          invalidated.count,
      };
    },
  );
}
