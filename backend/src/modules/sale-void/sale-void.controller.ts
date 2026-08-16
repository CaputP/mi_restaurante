import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import {
  appendRealtimeResources,
} from "../../middlewares/realtime.middleware.js";

import {
  publishRealtimeChange,
} from "../realtime/realtime-broker.js";

import {
  voidSaleParamsSchema,
  voidSaleSchema,
} from "./sale-void.schema.js";

import {
  voidSale,
} from "./sale-void.service.js";

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

export async function voidSaleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
    } =
      voidSaleParamsSchema
        .parse(
          request.params,
        );

    const input =
      voidSaleSchema.parse(
        request.body,
      );

    const result =
      await voidSale(
        getRequestAuth(
          request,
        ),
        id,
        input,
      );

    const {
      realtimeClienteId,
      realtimePromocionCambiada,
      ...sale
    } = result;

    if (
      realtimePromocionCambiada
    ) {
      appendRealtimeResources(
        response,
        "PROMOTIONS",
      );
    }

    if (realtimeClienteId) {
      await publishRealtimeChange(
        [
          "LOYALTY",
        ],
        [
          realtimeClienteId,
        ],
      );
    }

    response.status(200).json({
      success:
        true,

      message:
        "Venta anulada correctamente.",

      data: {
        venta:
          sale,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}
