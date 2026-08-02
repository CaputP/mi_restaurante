import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import {
  createPromotionSchema,
  promotionListQuerySchema,
  promotionOptionsQuerySchema,
  promotionParamsSchema,
  updatePromotionSchema,
  updatePromotionStatusSchema,
} from "./promotions.schema.js";

import {
  createPromotion,
  getPromotionById,
  getPromotionOptions,
  listPromotions,
  updatePromotion,
  updatePromotionStatus,
} from "./promotions.service.js";

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

export async function getPromotionOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      promotionOptionsQuerySchema
        .parse(
          request.query,
        );

    const options =
      await getPromotionOptions(
        getRequestAuth(
          request,
        ),
        query.sucursalId,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Opciones obtenidas correctamente.",

      data:
        options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listPromotionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      promotionListQuerySchema
        .parse(
          request.query,
        );

    const result =
      await listPromotions(
        getRequestAuth(
          request,
        ),
        query,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Promociones obtenidas correctamente.",

      data:
        result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getPromotionByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
    } =
      promotionParamsSchema
        .parse(
          request.params,
        );

    const promotion =
      await getPromotionById(
        getRequestAuth(
          request,
        ),
        id,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Promoción obtenida correctamente.",

      data: {
        promocion:
          promotion,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createPromotionController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createPromotionSchema
        .parse(
          request.body,
        );

    const promotion =
      await createPromotion(
        getRequestAuth(
          request,
        ),
        input,
      );

    response.status(201).json({
      success:
        true,

      message:
        "Promoción creada correctamente.",

      data: {
        promocion:
          promotion,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updatePromotionController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
    } =
      promotionParamsSchema
        .parse(
          request.params,
        );

    const input =
      updatePromotionSchema
        .parse(
          request.body,
        );

    const promotion =
      await updatePromotion(
        getRequestAuth(
          request,
        ),
        id,
        input,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Promoción actualizada correctamente.",

      data: {
        promocion:
          promotion,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updatePromotionStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
    } =
      promotionParamsSchema
        .parse(
          request.params,
        );

    const {
      estado,
    } =
      updatePromotionStatusSchema
        .parse(
          request.body,
        );

    const promotion =
      await updatePromotionStatus(
        getRequestAuth(
          request,
        ),
        id,
        estado,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Estado actualizado correctamente.",

      data: {
        promocion:
          promotion,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}