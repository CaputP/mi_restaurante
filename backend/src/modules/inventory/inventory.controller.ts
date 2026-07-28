import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  createDailyStockSchema,
  createInventoryMovementSchema,
  listInventoryQuerySchema,
  listMovementsQuerySchema,
} from "./inventory.schema.js";

import {
  createDailyStock,
  createInventoryMovement,
  listInventory,
  listInventoryMovements,
} from "./inventory.service.js";

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

export async function listInventoryController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listInventoryQuerySchema.parse(
        request.query,
      );

    const inventory =
      await listInventory(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Inventario obtenido correctamente.",
      data: inventory,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createDailyStockController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createDailyStockSchema.parse(
        request.body,
      );

    const stock =
      await createDailyStock(
        getRequestAuth(request),
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Stock diario inicializado correctamente.",
      data: {
        stock,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createInventoryMovementController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createInventoryMovementSchema.parse(
        request.body,
      );

    const movement =
      await createInventoryMovement(
        getRequestAuth(request),
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Movimiento de inventario registrado correctamente.",
      data: {
        movimiento: movement,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listInventoryMovementsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listMovementsQuerySchema.parse(
        request.query,
      );

    const movements =
      await listInventoryMovements(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Movimientos obtenidos correctamente.",
      data: {
        movimientos: movements,
        total: movements.length,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}