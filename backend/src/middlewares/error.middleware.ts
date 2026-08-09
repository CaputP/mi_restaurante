import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { AppError } from "../shared/errors/app-error.js";
import {
  logger,
} from "../lib/logger.js";

export const errorMiddleware: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
): void => {
  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      message: "Los datos enviados no son válidos.",
      code: "VALIDATION_ERROR",
      errors: error.issues.map((issue) => ({
        campo: issue.path.join("."),
        mensaje: issue.message,
      })),
    });

    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
    });

    return;
  }

  const requestId =
    response.getHeader(
      "x-request-id",
    );

  logger.error(
    {
      error,
      requestId,
    },
    "Error no controlado.",
  );

  response.status(500).json({
    success: false,
    message: "Ocurrió un error interno en el servidor.",
    code: "INTERNAL_SERVER_ERROR",
    requestId:
      requestId ?? null,
  });
};
