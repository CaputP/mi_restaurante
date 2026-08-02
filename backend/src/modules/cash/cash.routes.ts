import { Router } from "express";

import {
  requireAuth,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  closeCashRegisterController,
  getCashOptionsController,
  getCashRegisterByIdController,
  getCurrentCashRegisterController,
  listCashRegistersController,
  openCashRegisterController,
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
  getCashOptionsController,
);

cashRouter.get(
  "/current",
  getCurrentCashRegisterController,
);

cashRouter.get(
  "/",
  listCashRegistersController,
);

cashRouter.post(
  "/open",
  openCashRegisterController,
);

cashRouter.patch(
  "/:id/close",
  closeCashRegisterController,
);

cashRouter.get(
  "/:id",
  getCashRegisterByIdController,
);