import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import {
  listAvailablePromotions,
} from "./promotions-client.service.js";

export async function listAvailablePromotionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(
        401,
        "Debes iniciar sesión.",
        "TOKEN_REQUERIDO",
      );
    }

    const result =
      await listAvailablePromotions();

    response.status(200).json({
      success:
        true,

      message:
        "Promociones disponibles obtenidas correctamente.",

      data:
        result,
    });
  } catch (error: unknown) {
    next(error);
  }
}
