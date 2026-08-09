import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "../../shared/legal/legal-versions.js";

export async function createAuthSession(
  usuarioId: string,
) {
  const usuario = await prisma.usuario.findUnique({
    where: {
      id: usuarioId,
    },

    select: {
      id: true,
      nombres: true,
      apellidos: true,
      correo: true,
      telefono: true,
      estado: true,
      correoVerificado: true,
      sessionVersion: true,
      terminosVersion: true,
      privacidadVersion: true,

      rol: {
        select: {
          id: true,
          codigo: true,
          nombre: true,

          permisos: {
            where: {
              permiso: {
                activo: true,
              },
            },
            select: {
              permiso: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  modulo: true,
                },
              },
            },
          },
        },
      },

      sucursales: {
        where: {
          activo: true,
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
      },
    },
  });

  if (!usuario) {
    throw new AppError(
      401,
      "No se encontró la cuenta del usuario.",
      "USUARIO_NO_ENCONTRADO",
    );
  }

  if (usuario.estado === "BLOQUEADO") {
    throw new AppError(
      403,
      "La cuenta se encuentra bloqueada.",
      "USUARIO_BLOQUEADO",
    );
  }

  if (usuario.estado !== "ACTIVO") {
    throw new AppError(
      403,
      "La cuenta no se encuentra activa.",
      "USUARIO_INACTIVO",
    );
  }

  const token = jwt.sign(
    {
      rol: usuario.rol.codigo,
      correo: usuario.correo,
      sessionVersion: usuario.sessionVersion,
    },
    env.JWT_SECRET,
    {
      subject: usuario.id,
      expiresIn: env.JWT_EXPIRES_IN_SECONDS,
      issuer: "el-vallecito-api",
      audience: "el-vallecito-web",
      algorithm: "HS256",
    },
  );

  await prisma.usuario.update({
    where: {
      id: usuario.id,
    },
    data: {
      ultimoAcceso: new Date(),
    },
  });

  return {
    token,
    tokenType: "Bearer",
    expiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,

    usuario: {
      id: usuario.id,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      nombreCompleto:
        `${usuario.nombres} ${usuario.apellidos}`.trim(),
      correo: usuario.correo,
      telefono: usuario.telefono,
      rol: {
        id: usuario.rol.id,
        codigo: usuario.rol.codigo,
        nombre: usuario.rol.nombre,
      },
      permisos:
        usuario.rol.permisos.map(
          ({ permiso }) =>
            permiso,
        ),
      correoVerificado: usuario.correoVerificado,
      requiereAceptacionLegal:
        usuario.terminosVersion !== TERMS_VERSION ||
        usuario.privacidadVersion !== PRIVACY_VERSION,

      sucursales: usuario.sucursales.map(
        ({ sucursal }) => sucursal,
      ),
    },
  };
}
