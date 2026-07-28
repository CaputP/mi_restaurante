import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  createUserSchema,
  listUsersQuerySchema,
  resetUserPasswordSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdSchema,
} from "./user.schema.js";

import {
  createUser,
  getUserOptions,
  listUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from "./user.service.js";

function getRequestAuth(
  request: Request,
) {
  if (!request.auth) {
    throw new AppError(
      401,
      "Debes iniciar sesión.",
      "TOKEN_REQUERIDO",
    );
  }

  return {
    usuarioId:
      request.auth.usuarioId,

    rol: request.auth.rol,
  };
}

export async function getUserOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const options =
      await getUserOptions(
        getRequestAuth(request),
      );

    response.status(200).json({
      success: true,
      message:
        "Opciones de usuarios obtenidas correctamente.",
      data: options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listUsersController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listUsersQuerySchema.parse(
        request.query,
      );

    const result =
      await listUsers(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Usuarios obtenidos correctamente.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createUserController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createUserSchema.parse(
        request.body,
      );

    const user =
      await createUser(
        getRequestAuth(request),
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Usuario registrado correctamente.",
      data: {
        usuario: user,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateUserController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      userIdSchema.parse(
        request.params,
      );

    const input =
      updateUserSchema.parse(
        request.body,
      );

    const user =
      await updateUser(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Usuario actualizado correctamente.",
      data: {
        usuario: user,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateUserStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      userIdSchema.parse(
        request.params,
      );

    const input =
      updateUserStatusSchema.parse(
        request.body,
      );

    const user =
      await updateUserStatus(
        getRequestAuth(request),
        id,
        input,
      );

    const messages = {
      ACTIVO:
        "Usuario activado correctamente.",

      INACTIVO:
        "Usuario inactivado correctamente.",

      BLOQUEADO:
        "Usuario bloqueado correctamente.",
    };

    response.status(200).json({
      success: true,
      message:
        messages[input.estado],
      data: {
        usuario: user,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function resetUserPasswordController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      userIdSchema.parse(
        request.params,
      );

    const input =
      resetUserPasswordSchema.parse(
        request.body,
      );

    const user =
      await resetUserPassword(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Contraseña actualizada. Las sesiones anteriores fueron cerradas.",
      data: {
        usuario: user,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}