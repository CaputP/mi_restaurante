import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  createSaleSchema,
  listSalesQuerySchema,
  saleIdSchema,
  saleOptionsQuerySchema,
} from "./sale.schema.js";

import {
  createSale,
  getSaleById,
  getSaleOptions,
  listSales,
} from "./sale.service.js";

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

export async function getSaleOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      saleOptionsQuerySchema.parse(
        request.query,
      );

    const options =
      await getSaleOptions(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Opciones de ventas obtenidas correctamente.",
      data: options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listSalesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listSalesQuerySchema.parse(
        request.query,
      );

    const result =
      await listSales(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Ventas obtenidas correctamente.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getSaleByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      saleIdSchema.parse(
        request.params,
      );

    const sale =
      await getSaleById(
        getRequestAuth(request),
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Venta obtenida correctamente.",

      data: {
        venta:
          sale,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createSaleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createSaleSchema.parse(
        request.body,
      );

    const sale =
      await createSale(
        getRequestAuth(request),
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Venta registrada correctamente.",

      data: {
        venta:
          sale,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}