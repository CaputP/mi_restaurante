import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  getAuditByIdController,
  getAuditOptionsController,
  listAuditsController,
} from "./audit.controller.js";

export const auditRouter =
  Router();

auditRouter.use(
  requireAuth,
);

auditRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
);

auditRouter.get(
  "/options",
  getAuditOptionsController,
);

auditRouter.get(
  "/",
  listAuditsController,
);

auditRouter.get(
  "/:id",
  getAuditByIdController,
);

auditRouter.use(
  requirePermissions(
    "AUDITORIA_VER",
  ),
);
