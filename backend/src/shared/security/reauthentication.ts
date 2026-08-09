import {
  compare,
} from "bcryptjs";

import { prisma } from "../../lib/prisma.js";
import { AppError } from "../errors/app-error.js";

export async function reauthenticateUser(
  userId: string,
  password: string,
): Promise<void> {
  const user =
    await prisma.usuario.findUnique({
      where: {
        id: userId,
      },

      select: {
        estado: true,
        passwordHash: true,
      },
    });

  if (!user || user.estado !== "ACTIVO") {
    throw new AppError(
      401,
      "La cuenta ya no se encuentra disponible.",
      "REAUTENTICACION_FALLIDA",
    );
  }

  if (!user.passwordHash) {
    throw new AppError(
      409,
      "Esta cuenta no tiene una contraseña local configurada. Configura una antes de realizar acciones sensibles.",
      "PASSWORD_LOCAL_REQUERIDO",
    );
  }

  const validPassword =
    await compare(
      password,
      user.passwordHash,
    );

  if (!validPassword) {
    throw new AppError(
      401,
      "La contraseña de confirmación no es correcta.",
      "REAUTENTICACION_FALLIDA",
    );
  }
}
