import { Router } from "express";

import {
  requireAuth,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  createDailyStockController,
  createInventoryMovementController,
  listInventoryController,
  listInventoryMovementsController,
} from "./inventory.controller.js";

export const inventoryRouter =
  Router();

inventoryRouter.use(
  requireAuth,
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
);

inventoryRouter.get(
  "/",
  listInventoryController,
);

inventoryRouter.get(
  "/movements",
  listInventoryMovementsController,
);

inventoryRouter.post(
  "/daily-stock",
  createDailyStockController,
);

inventoryRouter.post(
  "/movements",
  createInventoryMovementController,
);