import { compare, hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma } from "../../generated/prisma/client.js";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import type {
  LoginInput,
  RegisterInput,
} from "./auth.schema.js";

import {
  sendEmailVerificationForUser,
} from "./auth-security.service.js";

interface JwtPayload {
  rol: string;
  correo: string;
  sessionVersion: number;
}

export async function login(input: LoginInput) {
  const correo = input.correo.trim().toLowerCase();

  const usuario = await prisma.usuario.findUnique({
    where: {
      correo,
    },

    select: {
      id: true,
      nombres: true,
      apellidos: true,
      correo: true,
      telefono: true,
      passwordHash: true,
      proveedorAuth: true,
      estado: true,
      correoVerificado: true,
      sessionVersion: true,

      rol: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
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

  /*
   * Se utiliza el mismo mensaje si el correo no existe o la contraseña
   * es incorrecta, para no revelar qué cuentas están registradas.
   */
  if (!usuario?.passwordHash) {
    throw new AppError(
      401,
      "Correo o contraseña incorrectos.",
      "CREDENCIALES_INVALIDAS",
    );
  }

  const passwordCorrecto = await compare(
    input.password,
    usuario.passwordHash,
  );

  if (!passwordCorrecto) {
    throw new AppError(
      401,
      "Correo o contraseña incorrectos.",
      "CREDENCIALES_INVALIDAS",
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

  const payload: JwtPayload = {
    rol: usuario.rol.codigo,
    correo: usuario.correo,
    sessionVersion: usuario.sessionVersion,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    subject: usuario.id,
    expiresIn: env.JWT_EXPIRES_IN_SECONDS,
    issuer: "el-vallecito-api",
    audience: "el-vallecito-web",
  });

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
      rol: usuario.rol,
      correoVerificado: usuario.correoVerificado,

      sucursales: usuario.sucursales.map(
        ({ sucursal }) => sucursal,
      ),
    },
  };
}

export async function register(
  input: RegisterInput,
) {
  const correo = input.correo.trim().toLowerCase();
  
  const usuarioExistente =
    await prisma.usuario.findUnique({
      where: {
        correo,
      },
      select: {
        id: true,
        proveedorAuth: true,
      },
    });

  if (usuarioExistente) {
    throw new AppError(
      409,
      "Ya existe una cuenta registrada con este correo.",
      "CORREO_YA_REGISTRADO",
    );
  }

  const rolCliente = await prisma.rol.findUnique({
    where: {
      codigo: "CLIENTE",
    },
    select: {
      id: true,
    },
  });

  if (!rolCliente) {
    throw new AppError(
      500,
      "No se encuentra configurado el rol de cliente.",
      "ROL_CLIENTE_NO_CONFIGURADO",
    );
  }

  const passwordHash = await hash(
    input.password,
    12,
  );

  try {
    await prisma.usuario.create({
      data: {
        rolId: rolCliente.id,
        nombres: input.nombres.trim(),
        apellidos: input.apellidos.trim(),
        telefono:
          input.telefono?.trim() || null,
        correo,
        passwordHash,
        proveedorAuth: "LOCAL",
        estado: "ACTIVO",
        correoVerificado: false,
      },
    });
  } catch (error: unknown) {
    /*
     * Aunque comprobamos primero el correo, dos peticiones
     * simultáneas podrían intentar crear la misma cuenta.
     */
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "Ya existe una cuenta registrada con este correo.",
        "CORREO_YA_REGISTRADO",
      );
    }

    throw error;
  }

  /*
   * Después del registro iniciamos sesión automáticamente
   * y devolvemos el mismo formato utilizado por /login.
   */
  return login({
    correo,
    password: input.password,
  });
}

export async function getCurrentUser(
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
      telefono: true,
      correo: true,
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

          permisos: {
            select: {
              permiso: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  modulo: true,
                  activo: true,
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
              direccion: true,
              estado: true,
            },
          },
        },
      },
    },
  });

  if (!usuario) {
    throw new AppError(
      401,
      "La cuenta asociada a la sesión ya no existe.",
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

  const permisos = usuario.rol.permisos
    .map(({ permiso }) => permiso)
    .filter((permiso) => permiso.activo)
    .map((permiso) => ({
      id: permiso.id,
      codigo: permiso.codigo,
      nombre: permiso.nombre,
      modulo: permiso.modulo,
    }));

  return {
    id: usuario.id,
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    nombreCompleto:
      `${usuario.nombres} ${usuario.apellidos}`.trim(),
    telefono: usuario.telefono,
    correo: usuario.correo,
    proveedorAuth: usuario.proveedorAuth,
    correoVerificado: usuario.correoVerificado,
    ultimoAcceso: usuario.ultimoAcceso,
    fechaRegistro: usuario.createdAt,

    rol: {
      id: usuario.rol.id,
      codigo: usuario.rol.codigo,
      nombre: usuario.rol.nombre,
    },

    permisos,

    sucursales: usuario.sucursales.map(
      ({ sucursal }) => sucursal,
    ),
  };
}