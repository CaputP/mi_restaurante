import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  exportReportExcelController,
  exportReportPdfController,
  getReportDetailsController,
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

reportRouter.use(
  requirePermissions(
    "REPORTE_VER",
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

reportRouter.get(
  "/details",
  getReportDetailsController,
);

reportRouter.get(
  "/export.xlsx",
  exportReportExcelController,
);

reportRouter.get(
  "/export.pdf",
  exportReportPdfController,
);
