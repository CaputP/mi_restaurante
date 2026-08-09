import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";
import {
  getAdminDashboardController,
} from "./dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/",
  requireAuth,
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
  requirePermissions(
    "DASHBOARD_VER",
  ),
  getAdminDashboardController,
);
