import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  reportOptionsQuerySchema,
  reportDetailsQuerySchema,
  reportSummaryQuerySchema,
} from "./report.schema.js";

import {
  getReportDetails,
  getReportOptions,
  getReportSummary,
} from "./report.service.js";

import {
  createReportPdf,
  createReportWorkbook,
} from "./report-export.service.js";

export async function getReportDetailsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      reportDetailsQuerySchema.parse(
        request.query,
      );

    const details =
      await getReportDetails(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Detalle del reporte obtenido correctamente.",
      data: details,
    });
  } catch (error: unknown) {
    next(error);
  }
}

function getRequestAuth(
  request: Request,
) {
  if (!request.auth) {
    throw new AppError(
      401,
      "Debes iniciar sesión.",
      "TOKEN_REQUERIDO",
    );
  }

  return {
    usuarioId:
      request.auth.usuarioId,

    rol:
      request.auth.rol,
  };
}

export async function getReportOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      reportOptionsQuerySchema
        .parse(
          request.query,
        );

    const options =
      await getReportOptions(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Opciones de reportes obtenidas correctamente.",
      data: options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getReportSummaryController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      reportSummaryQuerySchema
        .parse(
          request.query,
        );

    const report =
      await getReportSummary(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Reporte obtenido correctamente.",
      data: report,
    });
  } catch (error: unknown) {
    next(error);
  }
}

function reportFilename(
  extension: "pdf" | "xlsx",
  from?: string,
  to?: string,
): string {
  const range =
    from && to
      ? `${from}_${to}`
      : new Date()
        .toISOString()
        .slice(0, 10);

  return `reporte-vallecito-${range}.${extension}`;
}

export async function exportReportExcelController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      reportSummaryQuerySchema.parse(
        request.query,
      );
    const workbook =
      await createReportWorkbook(
        getRequestAuth(request),
        query,
      );

    response
      .status(200)
      .set({
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition":
          `attachment; filename="${reportFilename("xlsx", query.fechaDesde, query.fechaHasta)}"`,
        "cache-control":
          "private, no-store",
      })
      .send(workbook);
  } catch (error: unknown) {
    next(error);
  }
}

export async function exportReportPdfController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      reportSummaryQuerySchema.parse(
        request.query,
      );
    const pdf =
      await createReportPdf(
        getRequestAuth(request),
        query,
      );

    response
      .status(200)
      .set({
        "content-type":
          "application/pdf",
        "content-disposition":
          `attachment; filename="${reportFilename("pdf", query.fechaDesde, query.fechaHasta)}"`,
        "cache-control":
          "private, no-store",
      })
      .send(pdf);
  } catch (error: unknown) {
    next(error);
  }
}
