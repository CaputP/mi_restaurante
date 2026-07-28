import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  createProductSchema,
  listProductsQuerySchema,
  productIdSchema,
  updateProductSchema,
  updateProductStatusSchema,
} from "./product.schema.js";

import {
  createProduct,
  getProductOptions,
  listProducts,
  updateProduct,
  updateProductStatus,
} from "./product.service.js";

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

export async function getProductOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const options =
      await getProductOptions(
        getRequestAuth(request),
      );

    response.status(200).json({
      success: true,
      message:
        "Opciones del catálogo obtenidas correctamente.",
      data: options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listProductsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listProductsQuerySchema.parse(
        request.query,
      );

    const products =
      await listProducts(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Productos obtenidos correctamente.",
      data: {
        productos: products,
        total: products.length,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createProductController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createProductSchema.parse(
        request.body,
      );

    const product =
      await createProduct(
        getRequestAuth(request),
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Producto registrado correctamente.",
      data: {
        producto: product,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateProductController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      productIdSchema.parse(
        request.params,
      );

    const input =
      updateProductSchema.parse(
        request.body,
      );

    const product =
      await updateProduct(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Producto actualizado correctamente.",
      data: {
        producto: product,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateProductStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      productIdSchema.parse(
        request.params,
      );

    const input =
      updateProductStatusSchema.parse(
        request.body,
      );

    const product =
      await updateProductStatus(
        id,
        input,
      );

    response.status(200).json({
      success: true,

      message:
        input.estado === "ACTIVO"
          ? "Producto activado correctamente."
          : "Producto desactivado correctamente.",

      data: {
        producto: product,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}