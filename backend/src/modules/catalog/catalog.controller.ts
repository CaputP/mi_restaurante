import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  categoryIdSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
  updateCategoryStatusSchema,
} from "./catalog.schema.js";

import {
  createCategory,
  listCategories,
  updateCategory,
  updateCategoryStatus,
} from "./catalog.service.js";

export async function listCategoriesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listCategoriesQuerySchema.parse(
        request.query,
      );

    const categories =
      await listCategories(query);

    response.status(200).json({
      success: true,
      message:
        "Categorías obtenidas correctamente.",
      data: {
        categorias: categories,
        total: categories.length,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createCategoryController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createCategorySchema.parse(
        request.body,
      );

    const category =
      await createCategory(input);

    response.status(201).json({
      success: true,
      message:
        "Categoría creada correctamente.",
      data: {
        categoria: category,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateCategoryController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      categoryIdSchema.parse(
        request.params,
      );

    const input =
      updateCategorySchema.parse(
        request.body,
      );

    const category =
      await updateCategory(
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Categoría actualizada correctamente.",
      data: {
        categoria: category,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateCategoryStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      categoryIdSchema.parse(
        request.params,
      );

    const input =
      updateCategoryStatusSchema.parse(
        request.body,
      );

    const category =
      await updateCategoryStatus(
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        input.estado === "ACTIVO"
          ? "Categoría activada correctamente."
          : "Categoría desactivada correctamente.",
      data: {
        categoria: category,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}