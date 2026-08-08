import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import {
  getClientLoyaltyProfile,
} from "./loyalty-client.service.js";

export async function getMyLoyaltyProfileController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    if (!request.auth) {
      throw new AppError(
        401,
        "Debes iniciar sesión.",
        "TOKEN_REQUERIDO",
      );
    }

    const result =
      await getClientLoyaltyProfile(
        request
          .auth
          .usuarioId,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Perfil de fidelización obtenido correctamente.",

      data:
        result,
    });
  } catch (error: unknown) {
    next(error);
  }
}