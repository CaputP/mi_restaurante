import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import {
  loyaltyRedemptionOptionsQuerySchema,
  loyaltyRedemptionPreviewSchema,
} from "./loyalty-redemption.schema.js";

import {
  getLoyaltyRedemptionOptions,
  previewLoyaltyRedemption,
} from "./loyalty-redemption.service.js";

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

export async function getLoyaltyRedemptionOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const {
      pedidoId,
    } =
      loyaltyRedemptionOptionsQuerySchema
        .parse(
          request.query,
        );

    const result =
      await getLoyaltyRedemptionOptions(
        getRequestAuth(
          request,
        ),
        pedidoId,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Premios disponibles obtenidos correctamente.",

      data:
        result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function previewLoyaltyRedemptionController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const input =
      loyaltyRedemptionPreviewSchema
        .parse(
          request.body,
        );

    const result =
      await previewLoyaltyRedemption(
        getRequestAuth(
          request,
        ),
        input,
      );

    response.status(200).json({
      success:
        true,

      message:
        input.premioIds
          .length > 0
          ? "Premios calculados correctamente."
          : "No se seleccionaron premios.",

      data:
        result,
    });
  } catch (error: unknown) {
    next(error);
  }
}