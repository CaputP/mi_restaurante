import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  createExpenseCategorySchema,
  createExpenseSchema,
  expenseIdSchema,
  expenseOptionsQuerySchema,
  listExpensesQuerySchema,
  voidExpenseSchema,
} from "./expense.schema.js";

import {
  createExpense,
  createExpenseCategory,
  getExpenseById,
  getExpenseOptions,
  listExpenses,
  voidExpense,
} from "./expense.service.js";

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

export async function getExpenseOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      expenseOptionsQuerySchema
        .parse(
          request.query,
        );

    const options =
      await getExpenseOptions(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Opciones de gastos obtenidas correctamente.",
      data: options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listExpensesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listExpensesQuerySchema
        .parse(
          request.query,
        );

    const result =
      await listExpenses(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Gastos obtenidos correctamente.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getExpenseByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      expenseIdSchema.parse(
        request.params,
      );

    const expense =
      await getExpenseById(
        getRequestAuth(request),
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Gasto obtenido correctamente.",

      data: {
        gasto:
          expense,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createExpenseController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createExpenseSchema.parse(
        request.body,
      );

    const expense =
      await createExpense(
        getRequestAuth(request),
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Gasto registrado correctamente.",

      data: {
        gasto:
          expense,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createExpenseCategoryController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createExpenseCategorySchema
        .parse(
          request.body,
        );

    const category =
      await createExpenseCategory(
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Categoría de gasto creada correctamente.",

      data: {
        categoria:
          category,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function voidExpenseController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      expenseIdSchema.parse(
        request.params,
      );

    const input =
      voidExpenseSchema.parse(
        request.body,
      );

    const expense =
      await voidExpense(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Gasto anulado correctamente.",

      data: {
        gasto:
          expense,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}