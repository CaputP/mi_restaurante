import { Router } from "express";

import {
  requireAuth,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  createBranchController,
  createZoneController,
  getBranchByIdController,
  listBranchesController,
  updateBranchController,
  updateBranchStateController,
  updateZoneController,
  updateZoneStateController,
} from "./branch.controller.js";

export const branchRouter =
  Router();

branchRouter.use(
  requireAuth,
);

branchRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
  ),
);

branchRouter.get(
  "/",
  listBranchesController,
);

branchRouter.post(
  "/",
  createBranchController,
);

branchRouter.patch(
  "/:id/status",
  updateBranchStateController,
);

branchRouter.post(
  "/:id/zones",
  createZoneController,
);

branchRouter.patch(
  "/:id/zones/:zoneId/status",
  updateZoneStateController,
);

branchRouter.patch(
  "/:id/zones/:zoneId",
  updateZoneController,
);

branchRouter.patch(
  "/:id",
  updateBranchController,
);

branchRouter.get(
  "/:id",
  getBranchByIdController,
);