import { Router } from "express";

import {
  requireAuth,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  getReportOptionsController,
  getReportSummaryController,
} from "./report.controller.js";

export const reportRouter =
  Router();

reportRouter.use(
  requireAuth,
);

reportRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
);

reportRouter.get(
  "/options",
  getReportOptionsController,
);

reportRouter.get(
  "/summary",
  getReportSummaryController,
);