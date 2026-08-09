import type {
  NextFunction,
  Request,
  Response,
} from "express";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  requirePermissions,
} from "../src/middlewares/auth.middleware.js";
import { AppError } from "../src/shared/errors/app-error.js";

function requestWithPermissions(
  permisos: string[],
): Request {
  return {
    auth: {
      usuarioId: "user-id",
      rol: "VENDEDOR",
      permisos,
      correo: "test@example.com",
      sessionVersion: 1,
    },
  } as Request;
}

describe("autorización por permisos", () => {
  it("permite la acción solo cuando están todos los permisos requeridos", () => {
    const next = vi.fn();

    requirePermissions(
      "CAJA_ABRIR",
      "CAJA_CERRAR",
    )(
      requestWithPermissions([
        "CAJA_ABRIR",
        "CAJA_CERRAR",
      ]),
      {} as Response,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith();
  });

  it("rechaza la acción si falta un permiso", () => {
    const next = vi.fn();

    requirePermissions(
      "CAJA_CERRAR",
    )(
      requestWithPermissions([
        "CAJA_ABRIR",
      ]),
      {} as Response,
      next as NextFunction,
    );

    const error = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(
      AppError,
    );
    expect(error).toMatchObject({
      statusCode: 403,
      code: "PERMISO_REQUERIDO",
    });
  });
});
