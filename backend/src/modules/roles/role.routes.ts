import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";
import {
  listRolesController,
  updateRolePermissionsController,
} from "./role.controller.js";

export const roleRouter = Router();

roleRouter.use(
  requireAuth,
  requireRoles(
    "ADMINISTRADOR_GENERAL",
  ),
  requirePermissions(
    "ROL_GESTIONAR",
  ),
);

roleRouter.get(
  "/",
  listRolesController,
);

roleRouter.patch(
  "/:id/permissions",
  updateRolePermissionsController,
);
