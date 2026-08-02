import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  createDeliverySchema,
  deliveryIdSchema,
  deliveryOptionsQuerySchema,
  deliveryOrderIdSchema,
  listDeliveriesQuerySchema,
  readyOrdersQuerySchema,
} from "./delivery.schema.js";

import {
  completeDelivery,
  createDelivery,
  getDeliveryById,
  getDeliveryOptions,
  getReadyOrders,
  listDeliveries,
  pickupDelivery,
} from "./delivery.service.js";

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

export async function getDeliveryOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      deliveryOptionsQuerySchema
        .parse(
          request.query,
        );

    const options =
      await getDeliveryOptions(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Opciones de entregas obtenidas correctamente.",
      data: options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getReadyOrdersController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      readyOrdersQuerySchema
        .parse(
          request.query,
        );

    const result =
      await getReadyOrders(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Pedidos listos obtenidos correctamente.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listDeliveriesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listDeliveriesQuerySchema
        .parse(
          request.query,
        );

    const result =
      await listDeliveries(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Entregas obtenidas correctamente.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getDeliveryByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      deliveryIdSchema.parse(
        request.params,
      );

    const delivery =
      await getDeliveryById(
        getRequestAuth(request),
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Entrega obtenida correctamente.",
      data: {
        entrega: delivery,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createDeliveryController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { orderId } =
      deliveryOrderIdSchema
        .parse(
          request.params,
        );

    const input =
      createDeliverySchema.parse(
        request.body,
      );

    const delivery =
      await createDelivery(
        getRequestAuth(request),
        orderId,
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Entrega registrada correctamente.",
      data: {
        entrega: delivery,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function pickupDeliveryController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      deliveryIdSchema.parse(
        request.params,
      );

    const delivery =
      await pickupDelivery(
        getRequestAuth(request),
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Productos retirados correctamente.",
      data: {
        entrega: delivery,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function completeDeliveryController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      deliveryIdSchema.parse(
        request.params,
      );

    const delivery =
      await completeDelivery(
        getRequestAuth(request),
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Entrega completada correctamente.",
      data: {
        entrega: delivery,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}