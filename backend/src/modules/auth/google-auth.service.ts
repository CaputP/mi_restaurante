import { OAuth2Client } from "google-auth-library";

import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import type {
  GoogleLoginInput,
} from "./auth.schema.js";
import {
  createAuthSession,
} from "./auth-session.service.js";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "../../shared/legal/legal-versions.js";

const googleClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
);

export async function loginWithGoogle(
  input: GoogleLoginInput,
) {
  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: input.credential,
      audience: env.GOOGLE_CLIENT_ID,
    });

    payload = ticket.getPayload();
  } catch {
    throw new AppError(
      401,
      "La credencial de Google no es válida.",
      "GOOGLE_CREDENTIAL_INVALIDA",
    );
  }

  if (
    !payload?.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new AppError(
      401,
      "Google no pudo verificar la cuenta de correo.",
      "GOOGLE_EMAIL_NO_VERIFICADO",
    );
  }

  const googleSubject = payload.sub;
  const correo = payload.email
    .trim()
    .toLowerCase();

  /*
   * Primero se busca por sub, porque es el identificador
   * estable entregado por Google.
   */
  let usuario = await prisma.usuario.findUnique({
    where: {
      googleSubject,
    },
    select: {
      id: true,
    },
  });

  if (!usuario) {
    const usuarioPorCorreo =
      await prisma.usuario.findUnique({
        where: {
          correo,
        },
        select: {
          id: true,
          googleSubject: true,
          proveedorAuth: true,
        },
      });

    if (usuarioPorCorreo) {
      if (
        usuarioPorCorreo.googleSubject &&
        usuarioPorCorreo.googleSubject !==
          googleSubject
      ) {
        throw new AppError(
          409,
          "El correo ya está relacionado con otra cuenta de Google.",
          "GOOGLE_ACCOUNT_CONFLICT",
        );
      }

      /*
       * Si el usuario se registró anteriormente con
       * contraseña, se habilitan ambos métodos.
       */
      usuario = await prisma.usuario.update({
        where: {
          id: usuarioPorCorreo.id,
        },
        data: {
          googleSubject,
          proveedorAuth:
            usuarioPorCorreo.proveedorAuth === "LOCAL"
              ? "AMBOS"
              : usuarioPorCorreo.proveedorAuth,
          correoVerificado: true,
        },
        select: {
          id: true,
        },
      });
    } else {
      if (
        input.aceptaTerminos !== true ||
        input.versionTerminos !== TERMS_VERSION ||
        input.aceptaPrivacidad !== true ||
        input.versionPrivacidad !== PRIVACY_VERSION
      ) {
        throw new AppError(
          400,
          "Para crear una cuenta con Google debes aceptar los Términos y la Política de Privacidad vigentes.",
          "ACEPTACION_LEGAL_REQUERIDA",
        );
      }
      const rolCliente =
        await prisma.rol.findUnique({
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
          "No se encuentra configurado el rol CLIENTE.",
          "ROL_CLIENTE_NO_CONFIGURADO",
        );
      }

      const aliasCorreo =
        correo.split("@")[0]?.trim() || "USUARIO";

      const nombres =
        payload.given_name?.trim() ||
        payload.name?.trim() ||
        aliasCorreo;

      const apellidos =
        payload.family_name?.trim() || "";

      usuario = await prisma.usuario.create({
        data: {
          rolId: rolCliente.id,
          nombres,
          apellidos,
          correo,
          telefono: null,
          passwordHash: null,
          googleSubject,
          proveedorAuth: "GOOGLE",
          correoVerificado: true,
          estado: "ACTIVO",
          terminosAceptadosAt: new Date(),
          terminosVersion: TERMS_VERSION,
          privacidadAceptadaAt: new Date(),
          privacidadVersion: PRIVACY_VERSION,
        },
        select: {
          id: true,
        },
      });
    }
  }

  return createAuthSession(usuario.id);
}
