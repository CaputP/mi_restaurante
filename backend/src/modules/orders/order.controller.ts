import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  createOrderSchema,
  listOrdersQuerySchema,
  orderIdSchema,
  orderOptionsQuerySchema,
  sendOrderSchema,
  updateOrderSchema,
} from "./order.schema.js";

import {
  createOrder,
  getOrderById,
  getOrderOptions,
  listOrders,
  sendOrder,
  updateOrder,
} from "./order.service.js";

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

export async function getOrderOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      orderOptionsQuerySchema.parse(
        request.query,
      );

    const options =
      await getOrderOptions(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Opciones de pedidos obtenidas correctamente.",
      data: options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listOrdersController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listOrdersQuerySchema.parse(
        request.query,
      );

    const result =
      await listOrders(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Pedidos obtenidos correctamente.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getOrderByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      orderIdSchema.parse(
        request.params,
      );

    const order =
      await getOrderById(
        getRequestAuth(request),
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Pedido obtenido correctamente.",
      data: {
        pedido: order,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createOrderController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createOrderSchema.parse(
        request.body,
      );

    const order =
      await createOrder(
        getRequestAuth(request),
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Pedido registrado correctamente.",
      data: {
        pedido: order,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateOrderController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      orderIdSchema.parse(
        request.params,
      );

    const input =
      updateOrderSchema.parse(
        request.body,
      );

    const order =
      await updateOrder(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Pedido actualizado correctamente.",

      data: {
        pedido: order,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function sendOrderController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      orderIdSchema.parse(
        request.params,
      );

    const input =
      sendOrderSchema.parse(
        request.body,
      );

    const order =
      await sendOrder(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,

      message:
        order.estado ===
        "LISTO"
          ? "Pedido enviado. Todos los productos están listos."
          : "Pedido enviado y comandas generadas correctamente.",

      data: {
        pedido: order,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}