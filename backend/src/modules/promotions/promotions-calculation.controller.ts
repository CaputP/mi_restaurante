import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import {
  promotionPreviewSchema,
} from "./promotions-calculation.schema.js";

import {
  previewAutomaticPromotions,
} from "./promotions-calculation.service.js";

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

    rol:
      request.auth.rol,
  };
}

export async function previewAutomaticPromotionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      pedidoId,
    } =
      promotionPreviewSchema
        .parse(
          request.body,
        );

    const result =
      await previewAutomaticPromotions(
        getRequestAuth(
          request,
        ),
        pedidoId,
      );

    response.status(200).json({
      success:
        true,

      message:
        result.promociones
          .length > 0
          ? "Promociones calculadas correctamente."
          : "El pedido no tiene promociones aplicables.",

      data:
        result,
    });
  } catch (error: unknown) {
    next(error);
  }
}