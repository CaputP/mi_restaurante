import {
  Router,
} from "express";

import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  voidSaleController,
} from "./sale-void.controller.js";

export const saleVoidRouter =
  Router();

saleVoidRouter.use(
  requireAuth,
);

saleVoidRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
);

saleVoidRouter.patch(
  "/:id/void",
  requirePermissions(
    "VENTA_ANULAR",
  ),
  voidSaleController,
);
