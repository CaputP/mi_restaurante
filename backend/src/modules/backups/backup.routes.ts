import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";
import {
  listBackupsController,
  requestManualBackupController,
} from "./backup.controller.js";

export const backupRouter = Router();

backupRouter.use(
  requireAuth,
  requireRoles(
    "ADMINISTRADOR_GENERAL",
  ),
  requirePermissions(
    "RESPALDO_GESTIONAR",
  ),
);

backupRouter.get(
  "/",
  listBackupsController,
);

backupRouter.post(
  "/",
  requestManualBackupController,
);
