import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  createSaleController,
  getSaleByIdController,
  getSaleOptionsController,
  listSalesController,
} from "./sale.controller.js";

export const saleRouter =
  Router();

saleRouter.use(
  requireAuth,
);

saleRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
  ),
);

saleRouter.get(
  "/options",
  getSaleOptionsController,
);

saleRouter.get(
  "/",
  listSalesController,
);

saleRouter.post(
  "/",
  createSaleController,
);

saleRouter.get(
  "/:id",
  getSaleByIdController,
);

saleRouter.use(
  requirePermissions(
    "VENTA_CREAR",
  ),
);
