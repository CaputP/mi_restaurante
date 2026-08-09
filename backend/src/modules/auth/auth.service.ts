import { compare, hash } from "bcryptjs";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import type {
  LoginInput,
  RegisterInput,
  AcceptLegalInput,
} from "./auth.schema.js";

import {
  sendEmailVerificationForUser,
} from "./auth-security.service.js";
import { createAuthSession } from "./auth-session.service.js";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "../../shared/legal/legal-versions.js";

const DUMMY_PASSWORD_HASH =
  "$2b$12$lFPF5F6PG2PTvqV/ZTRqoezFMv.5AXMhPLd6AlnITfyaJmFB9KQqC";

function invalidCredentials(): AppError {
  return new AppError(
    401,
    "Correo o contraseña incorrectos.",
    "CREDENCIALES_INVALIDAS",
  );
}

export async function login(input: LoginInput) {
  const correo = input.correo.trim().toLowerCase();

  const usuario = await prisma.usuario.findUnique({
    where: {
      correo,
    },

    select: {
      id: true,
      passwordHash: true,
      estado: true,
    },
  });

  /*
   * Se utiliza el mismo mensaje si el correo no existe o la contraseña
   * es incorrecta, para no revelar qué cuentas están registradas.
   */
  if (!usuario?.passwordHash) {
    await compare(
      input.password,
      DUMMY_PASSWORD_HASH,
    );
    throw invalidCredentials();
  }

  const passwordCorrecto = await compare(
    input.password,
    usuario.passwordHash,
  );

  if (!passwordCorrecto) {
    throw invalidCredentials();
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

  return createAuthSession(usuario.id);
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
        terminosAceptadosAt: new Date(),
        terminosVersion: TERMS_VERSION,
        privacidadAceptadaAt: new Date(),
        privacidadVersion: PRIVACY_VERSION,
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
      terminosVersion: true,
      privacidadVersion: true,

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
    requiereAceptacionLegal:
      usuario.terminosVersion !== TERMS_VERSION ||
      usuario.privacidadVersion !== PRIVACY_VERSION,

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

export async function acceptCurrentLegalPolicies(
  usuarioId: string,
  _input: AcceptLegalInput,
) {
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      terminosAceptadosAt: new Date(),
      terminosVersion: TERMS_VERSION,
      privacidadAceptadaAt: new Date(),
      privacidadVersion: PRIVACY_VERSION,
    },
  });

  return getCurrentUser(usuarioId);
}
