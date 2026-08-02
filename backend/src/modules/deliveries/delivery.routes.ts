import { Router } from "express";

import {
  requireAuth,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  completeDeliveryController,
  createDeliveryController,
  getDeliveryByIdController,
  getDeliveryOptionsController,
  getReadyOrdersController,
  listDeliveriesController,
  pickupDeliveryController,
} from "./delivery.controller.js";

export const deliveryRouter =
  Router();

deliveryRouter.use(
  requireAuth,
);

deliveryRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "MOZO",
  ),
);

deliveryRouter.get(
  "/options",
  getDeliveryOptionsController,
);

deliveryRouter.get(
  "/ready-orders",
  getReadyOrdersController,
);

deliveryRouter.get(
  "/",
  listDeliveriesController,
);

deliveryRouter.post(
  "/orders/:orderId",
  createDeliveryController,
);

deliveryRouter.patch(
  "/:id/pickup",
  pickupDeliveryController,
);

deliveryRouter.patch(
  "/:id/complete",
  completeDeliveryController,
);

deliveryRouter.get(
  "/:id",
  getDeliveryByIdController,
);