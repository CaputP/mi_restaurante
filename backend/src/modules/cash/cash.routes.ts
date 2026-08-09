import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  closeCashRegisterController,
  getCashOptionsController,
  getCashRegisterByIdController,
  getCurrentCashRegisterController,
  listCashRegistersController,
  openCashRegisterController,
  reopenCashRegisterController,
} from "./cash.controller.js";

export const cashRouter =
  Router();

cashRouter.use(
  requireAuth,
);

cashRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
  ),
);

cashRouter.get(
  "/options",
  requirePermissions("CAJA_ABRIR"),
  getCashOptionsController,
);

cashRouter.get(
  "/current",
  requirePermissions("CAJA_ABRIR"),
  getCurrentCashRegisterController,
);

cashRouter.get(
  "/",
  requirePermissions("CAJA_ABRIR"),
  listCashRegistersController,
);

cashRouter.post(
  "/open",
  requirePermissions("CAJA_ABRIR"),
  openCashRegisterController,
);

cashRouter.patch(
  "/:id/close",
  requirePermissions("CAJA_CERRAR"),
  closeCashRegisterController,
);

cashRouter.patch(
  "/:id/reopen",
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
  requirePermissions("CAJA_CERRAR"),
  reopenCashRegisterController,
);

cashRouter.get(
  "/:id",
  requirePermissions("CAJA_ABRIR"),
  getCashRegisterByIdController,
);
