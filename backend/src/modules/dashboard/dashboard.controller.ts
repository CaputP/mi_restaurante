import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";
import {
  getAdminDashboard,
} from "./dashboard.service.js";

export async function getAdminDashboardController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(
        401,
        "Debes iniciar sesión.",
        "TOKEN_REQUERIDO",
      );
    }

    const dashboard =
      await getAdminDashboard({
        usuarioId:
          request.auth.usuarioId,
        rol: request.auth.rol,
      });

    response.status(200).json({
      success: true,
      message:
        "Dashboard obtenido correctamente.",
      data: dashboard,
    });
  } catch (error: unknown) {
    next(error);
  }
}