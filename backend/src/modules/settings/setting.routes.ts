import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  createSettingController,
  getSettingByIdController,
  getSettingOptionsController,
  listCorrelativesController,
  listSettingsController,
  updateCorrelativeController,
  updateSettingController,
  updateSettingEditabilityController,
} from "./setting.controller.js";

export const settingRouter =
  Router();

settingRouter.use(
  requireAuth,
);

settingRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
);

settingRouter.get(
  "/options",
  getSettingOptionsController,
);

settingRouter.get(
  "/correlatives",
  listCorrelativesController,
);

settingRouter.patch(
  "/correlatives/:tipoDocumento",
  updateCorrelativeController,
);

settingRouter.get(
  "/",
  listSettingsController,
);

settingRouter.post(
  "/",
  createSettingController,
);

settingRouter.patch(
  "/:id/editability",
  updateSettingEditabilityController,
);

settingRouter.patch(
  "/:id",
  updateSettingController,
);

settingRouter.get(
  "/:id",
  getSettingByIdController,
);

settingRouter.use(
  requirePermissions(
    "CONFIGURACION_GESTIONAR",
  ),
);
