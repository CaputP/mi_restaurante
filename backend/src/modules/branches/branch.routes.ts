import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
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
  requirePermissions("SUCURSAL_GESTIONAR"),
  listBranchesController,
);

branchRouter.post(
  "/",
  requirePermissions("SUCURSAL_GESTIONAR"),
  createBranchController,
);

branchRouter.patch(
  "/:id/status",
  requirePermissions("SUCURSAL_GESTIONAR"),
  updateBranchStateController,
);

branchRouter.post(
  "/:id/zones",
  requirePermissions("ZONA_GESTIONAR"),
  createZoneController,
);

branchRouter.patch(
  "/:id/zones/:zoneId/status",
  requirePermissions("ZONA_GESTIONAR"),
  updateZoneStateController,
);

branchRouter.patch(
  "/:id/zones/:zoneId",
  requirePermissions("ZONA_GESTIONAR"),
  updateZoneController,
);

branchRouter.patch(
  "/:id",
  requirePermissions("SUCURSAL_GESTIONAR"),
  updateBranchController,
);

branchRouter.get(
  "/:id",
  requirePermissions("SUCURSAL_GESTIONAR"),
  getBranchByIdController,
);
