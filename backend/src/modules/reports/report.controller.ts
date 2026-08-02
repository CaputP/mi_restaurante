import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  reportOptionsQuerySchema,
  reportSummaryQuerySchema,
} from "./report.schema.js";

import {
  getReportOptions,
  getReportSummary,
} from "./report.service.js";

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