import { hash } from "bcryptjs";

import { env } from "../../config/env.js";
import {
  expirationDate,
  generateSecurityToken,
  hashSecurityToken,
} from "../../lib/security-token.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./auth-email.service.js";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
} from "./auth.schema.js";

export async function sendEmailVerificationForUser(
  usuarioId: string,
): Promise<{
  alreadyVerified: boolean;
}> {
  const usuario = await prisma.usuario.findUnique({
    where: {
      id: usuarioId,
    },
    select: {
      id: true,
      nombres: true,
      correo: true,
      correoVerificado: true,
      estado: true,
    },
  });

  if (!usuario) {
    throw new AppError(
      404,
      "No se encontró la cuenta del usuario.",
      "USUARIO_NO_ENCONTRADO",
    );
  }

  if (usuario.estado !== "ACTIVO") {
    throw new AppError(
      403,
      "La cuenta no se encuentra activa.",
      "USUARIO_INACTIVO",
    );
  }

  if (usuario.correoVerificado) {
    return {
      alreadyVerified: true,
    };
  }

  const { token, tokenHash } =
    generateSecurityToken();

  await prisma.$transaction([
    prisma.tokenVerificacionCorreo.deleteMany({
      where: {
        usuarioId: usuario.id,
        usadoAt: null,
      },
    }),

    prisma.tokenVerificacionCorreo.create({
      data: {
        usuarioId: usuario.id,
        tokenHash,
        expiraAt: expirationDate(
          env.EMAIL_VERIFICATION_TTL_MINUTES,
        ),
      },
    }),
  ]);

  await sendVerificationEmail({
    correo: usuario.correo,
    nombre: usuario.nombres,
    token,
  });

  return {
    alreadyVerified: false,
  };
}

export async function confirmEmailVerification(
  token: string,
): Promise<void> {
  const tokenHash = hashSecurityToken(token);
  const now = new Date();

  const tokenRecord =
    await prisma.tokenVerificacionCorreo.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        usuarioId: true,
        usadoAt: true,
        expiraAt: true,
      },
    });

  if (!tokenRecord) {
    throw new AppError(
      400,
      "El enlace de verificación no es válido.",
      "TOKEN_VERIFICACION_INVALIDO",
    );
  }

  if (tokenRecord.usadoAt) {
    throw new AppError(
      400,
      "Este enlace de verificación ya fue utilizado.",
      "TOKEN_VERIFICACION_USADO",
    );
  }

  if (tokenRecord.expiraAt <= now) {
    throw new AppError(
      400,
      "El enlace de verificación ha expirado.",
      "TOKEN_VERIFICACION_EXPIRADO",
    );
  }

  await prisma.$transaction(async (transaction) => {
    const updated =
      await transaction.tokenVerificacionCorreo.updateMany(
        {
          where: {
            id: tokenRecord.id,
            usadoAt: null,
            expiraAt: {
              gt: now,
            },
          },
          data: {
            usadoAt: now,
          },
        },
      );

    if (updated.count !== 1) {
      throw new AppError(
        400,
        "El enlace ya fue utilizado o ha expirado.",
        "TOKEN_VERIFICACION_INVALIDO",
      );
    }

    await transaction.usuario.update({
      where: {
        id: tokenRecord.usuarioId,
      },
      data: {
        correoVerificado: true,
      },
    });

    await transaction.tokenVerificacionCorreo.deleteMany({
      where: {
        usuarioId: tokenRecord.usuarioId,
        id: {
          not: tokenRecord.id,
        },
        usadoAt: null,
      },
    });
  });
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<void> {
  const correo = input.correo.trim().toLowerCase();

  const usuario = await prisma.usuario.findUnique({
    where: {
      correo,
    },
    select: {
      id: true,
      nombres: true,
      correo: true,
      estado: true,
    },
  });

  /*
   * No informamos si la cuenta existe o no.
   * Así evitamos revelar los correos registrados.
   */
  if (!usuario || usuario.estado !== "ACTIVO") {
    return;
  }

  const { token, tokenHash } =
    generateSecurityToken();

  await prisma.$transaction([
    prisma.tokenRecuperacionPassword.deleteMany({
      where: {
        usuarioId: usuario.id,
        usadoAt: null,
      },
    }),

    prisma.tokenRecuperacionPassword.create({
      data: {
        usuarioId: usuario.id,
        tokenHash,
        expiraAt: expirationDate(
          env.PASSWORD_RESET_TTL_MINUTES,
        ),
      },
    }),
  ]);

  await sendPasswordResetEmail({
    correo: usuario.correo,
    nombre: usuario.nombres,
    token,
  });
}

export async function resetPasswordWithToken(
  input: ResetPasswordInput,
): Promise<void> {
  const tokenHash = hashSecurityToken(input.token);
  const now = new Date();

  const tokenRecord =
    await prisma.tokenRecuperacionPassword.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        usuarioId: true,
        usadoAt: true,
        expiraAt: true,

        usuario: {
          select: {
            estado: true,
            proveedorAuth: true,
          },
        },
      },
    });

  if (!tokenRecord) {
    throw new AppError(
      400,
      "El enlace de recuperación no es válido.",
      "TOKEN_RECUPERACION_INVALIDO",
    );
  }

  if (tokenRecord.usadoAt) {
    throw new AppError(
      400,
      "Este enlace de recuperación ya fue utilizado.",
      "TOKEN_RECUPERACION_USADO",
    );
  }

  if (tokenRecord.expiraAt <= now) {
    throw new AppError(
      400,
      "El enlace de recuperación ha expirado.",
      "TOKEN_RECUPERACION_EXPIRADO",
    );
  }

  if (tokenRecord.usuario.estado !== "ACTIVO") {
    throw new AppError(
      403,
      "La cuenta no se encuentra activa.",
      "USUARIO_INACTIVO",
    );
  }

  const passwordHash = await hash(
    input.password,
    12,
  );

  await prisma.$transaction(async (transaction) => {
    const updated =
      await transaction.tokenRecuperacionPassword.updateMany(
        {
          where: {
            id: tokenRecord.id,
            usadoAt: null,
            expiraAt: {
              gt: now,
            },
          },
          data: {
            usadoAt: now,
          },
        },
      );

    if (updated.count !== 1) {
      throw new AppError(
        400,
        "El enlace ya fue utilizado o ha expirado.",
        "TOKEN_RECUPERACION_INVALIDO",
      );
    }

    await transaction.usuario.update({
      where: {
        id: tokenRecord.usuarioId,
      },
      data: {
        passwordHash,

        proveedorAuth:
          tokenRecord.usuario.proveedorAuth === "GOOGLE"
            ? "AMBOS"
            : tokenRecord.usuario.proveedorAuth,

        correoVerificado: true,

        /*
         * Todo JWT emitido con la versión anterior
         * dejará de ser válido.
         */
        sessionVersion: {
          increment: 1,
        },
      },
    });

    await transaction.tokenRecuperacionPassword.deleteMany({
      where: {
        usuarioId: tokenRecord.usuarioId,
        id: {
          not: tokenRecord.id,
        },
        usadoAt: null,
      },
    });

    await transaction.tokenVerificacionCorreo.deleteMany({
      where: {
        usuarioId: tokenRecord.usuarioId,
        usadoAt: null,
      },
    });
  });
}