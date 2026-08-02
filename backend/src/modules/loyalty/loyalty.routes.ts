import {
  Router,
} from "express";

import {
  requireAuth,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  getLoyaltyCustomerByIdController,
  listLoyaltyCustomersController,
} from "./loyalty-customer.controller.js";

import {
  createLoyaltyProgramController,
  getLoyaltyOptionsController,
  getLoyaltyProgramByIdController,
  listLoyaltyProgramsController,
  updateLoyaltyProgramController,
  updateLoyaltyProgramStatusController,
} from "./loyalty.controller.js";

export const loyaltyRouter =
  Router();

loyaltyRouter.use(
  requireAuth,
);

loyaltyRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
);

loyaltyRouter.get(
  "/options",
  getLoyaltyOptionsController,
);

loyaltyRouter.get(
  "/programs",
  listLoyaltyProgramsController,
);

loyaltyRouter.get(
  "/customers",
  listLoyaltyCustomersController,
);

loyaltyRouter.get(
  "/customers/:id",
  getLoyaltyCustomerByIdController,
);

loyaltyRouter.get(
  "/programs/:id",
  getLoyaltyProgramByIdController,
);

loyaltyRouter.post(
  "/programs",
  createLoyaltyProgramController,
);

loyaltyRouter.patch(
  "/programs/:id",
  updateLoyaltyProgramController,
);

loyaltyRouter.patch(
  "/programs/:id/status",
  updateLoyaltyProgramStatusController,
);