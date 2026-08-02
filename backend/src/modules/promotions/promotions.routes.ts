import {
  Router,
} from "express";

import {
  requireAuth,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  previewAutomaticPromotionsController,
} from "./promotions-calculation.controller.js";

import {
  createPromotionController,
  getPromotionByIdController,
  getPromotionOptionsController,
  listPromotionsController,
  updatePromotionController,
  updatePromotionStatusController,
} from "./promotions.controller.js";

export const promotionRouter =
  Router();

promotionRouter.use(
  requireAuth,
);

/*
 * La vista previa es utilizada durante el cobro,
 * por eso también está disponible para VENDEDOR.
 */
promotionRouter.post(
  "/preview",
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
  ),
  previewAutomaticPromotionsController,
);

/*
 * La administración de promociones continúa
 * restringida a administradores.
 */
promotionRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
);

promotionRouter.get(
  "/options",
  getPromotionOptionsController,
);

promotionRouter.get(
  "/",
  listPromotionsController,
);

promotionRouter.get(
  "/:id",
  getPromotionByIdController,
);

promotionRouter.post(
  "/",
  createPromotionController,
);

promotionRouter.patch(
  "/:id",
  updatePromotionController,
);

promotionRouter.patch(
  "/:id/status",
  updatePromotionStatusController,
);