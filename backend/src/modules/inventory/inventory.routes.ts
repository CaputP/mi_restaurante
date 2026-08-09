import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
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
  requirePermissions("INVENTARIO_VER"),
  listInventoryController,
);

inventoryRouter.get(
  "/movements",
  requirePermissions("INVENTARIO_VER"),
  listInventoryMovementsController,
);

inventoryRouter.post(
  "/daily-stock",
  requirePermissions("INVENTARIO_AJUSTAR"),
  createDailyStockController,
);

inventoryRouter.post(
  "/movements",
  requirePermissions("INVENTARIO_AJUSTAR"),
  createInventoryMovementController,
);
