import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  createAvailabilityBlockController,
  getBranchAvailabilityController,
  replaceBranchSchedulesController,
  updateAvailabilityBlockController,
  updateAvailabilityBlockStatusController,
} from "./branch-availability.controller.js";

export const branchAvailabilityRouter =
  Router();

branchAvailabilityRouter.use(
  requireAuth,
);

branchAvailabilityRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
);

branchAvailabilityRouter.get(
  "/:id/availability",
  getBranchAvailabilityController,
);

branchAvailabilityRouter.put(
  "/:id/schedules",
  replaceBranchSchedulesController,
);

branchAvailabilityRouter.post(
  "/:id/blocks",
  createAvailabilityBlockController,
);

branchAvailabilityRouter.patch(
  "/:id/blocks/:blockId",
  updateAvailabilityBlockController,
);

branchAvailabilityRouter.patch(
  "/:id/blocks/:blockId/status",
  updateAvailabilityBlockStatusController,
);

branchAvailabilityRouter.use(
  requirePermissions(
    "SUCURSAL_GESTIONAR",
  ),
);
