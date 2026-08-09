import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  createOrderController,
  getOrderByIdController,
  getOrderCustomerRewardsController,
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
  requirePermissions("PEDIDO_VER"),
  getOrderOptionsController,
);

orderRouter.get(
  "/customer-rewards",
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
  ),
  requirePermissions("PEDIDO_VER"),
  getOrderCustomerRewardsController,
);

orderRouter.get(
  "/",
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
    "MOZO",
  ),
  requirePermissions("PEDIDO_VER"),
  listOrdersController,
);

orderRouter.post(
  "/",
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
  ),
  requirePermissions("PEDIDO_CREAR"),
  createOrderController,
);

orderRouter.patch(
  "/:id",
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
  ),
  requirePermissions("PEDIDO_MODIFICAR"),
  updateOrderController,
);

orderRouter.patch(
  "/:id/send",
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
  ),
  requirePermissions("PEDIDO_MODIFICAR"),
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
  requirePermissions("PEDIDO_VER"),
  getOrderByIdController,
);
