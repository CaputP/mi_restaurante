import { Router } from "express";

import {
  requireAuth,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  createOrderController,
  getOrderByIdController,
  getOrderOptionsController,
  listOrdersController,
  sendOrderController,
  updateOrderController,
} from "./order.controller.js";

export const orderRouter =
  Router();

orderRouter.use(
  requireAuth,
);

orderRouter.get(
  "/options",
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
  ),
  getOrderOptionsController,
);

orderRouter.get(
  "/",
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
    "MOZO",
  ),
  listOrdersController,
);

orderRouter.post(
  "/",
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
  ),
  createOrderController,
);

orderRouter.patch(
  "/:id",
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
  ),
  updateOrderController,
);

orderRouter.patch(
  "/:id/send",
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
  ),
  sendOrderController,
);

orderRouter.get(
  "/:id",
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
    "MOZO",
  ),
  getOrderByIdController,
);