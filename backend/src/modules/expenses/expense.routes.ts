import { Router } from "express";

import {
  requireAuth,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  createExpenseCategoryController,
  createExpenseController,
  getExpenseByIdController,
  getExpenseOptionsController,
  listExpensesController,
  voidExpenseController,
} from "./expense.controller.js";

export const expenseRouter =
  Router();

expenseRouter.use(
  requireAuth,
);

expenseRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
);

expenseRouter.get(
  "/options",
  getExpenseOptionsController,
);

expenseRouter.post(
  "/categories",
  createExpenseCategoryController,
);

expenseRouter.get(
  "/",
  listExpensesController,
);

expenseRouter.post(
  "/",
  createExpenseController,
);

expenseRouter.patch(
  "/:id/void",
  voidExpenseController,
);

expenseRouter.get(
  "/:id",
  getExpenseByIdController,
);