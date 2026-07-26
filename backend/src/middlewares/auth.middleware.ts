import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../shared/errors/app-error.js";

type AccessTokenPayload = JwtPayload & {
  sessionVersion?: unknown;
};

export async function requireAuth(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  const authorizationHeader =
    request.headers.authorization;

  if (!authorizationHeader) {
    next(
      new AppError(
        401,
        "Debes iniciar sesión para acceder a este recurso.",
        "TOKEN_REQUERIDO",
      ),
    );

    return;
  }

  const [scheme, token] = authorizationHeader
    .trim()
    .split(/\s+/);

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token
  ) {
    next(
      new AppError(
        401,
        "El encabezado de autorización no es válido.",
        "AUTH_HEADER_INVALIDO",
      ),
    );

    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      env.JWT_SECRET,
      {
        algorithms: ["HS256"],
        issuer: "el-vallecito-api",
        audience: "el-vallecito-web",
      },
    ) as AccessTokenPayload;

    if (
      typeof decoded.sub !== "string" ||
      typeof decoded.sessionVersion !== "number"
    ) {
      throw new AppError(
        401,
        "El token no contiene la información requerida.",
        "TOKEN_INVALIDO",
      );
    }

    const usuario =
      await prisma.usuario.findUnique({
        where: {
          id: decoded.sub,
        },
        select: {
          id: true,
          correo: true,
          estado: true,
          sessionVersion: true,

          rol: {
            select: {
              codigo: true,
            },
          },
        },
      });

    if (!usuario) {
      throw new AppError(
        401,
        "La sesión no está asociada a una cuenta válida.",
        "USUARIO_NO_ENCONTRADO",
      );
    }

    if (usuario.estado === "BLOQUEADO") {
      throw new AppError(
        403,
        "La cuenta se encuentra bloqueada.",
        "USUARIO_BLOQUEADO",
      );
    }

    if (usuario.estado !== "ACTIVO") {
      throw new AppError(
        403,
        "La cuenta no se encuentra activa.",
        "USUARIO_INACTIVO",
      );
    }

    if (
      usuario.sessionVersion !==
      decoded.sessionVersion
    ) {
      throw new AppError(
        401,
        "La sesión dejó de ser válida. Inicia sesión nuevamente.",
        "SESION_INVALIDADA",
      );
    }

    /*
     * Se toma el rol y el correo actuales de PostgreSQL,
     * no se confía en datos antiguos del token.
     */
    request.auth = {
      usuarioId: usuario.id,
      rol: usuario.rol.codigo,
      correo: usuario.correo,
      sessionVersion: usuario.sessionVersion,
    };

    next();
  } catch (error: unknown) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    if (
      error instanceof Error &&
      error.name === "TokenExpiredError"
    ) {
      next(
        new AppError(
          401,
          "La sesión ha expirado. Inicia sesión nuevamente.",
          "TOKEN_EXPIRADO",
        ),
      );

      return;
    }

    next(
      new AppError(
        401,
        "El token de autenticación no es válido.",
        "TOKEN_INVALIDO",
      ),
    );
  }
}

export function requireRoles(
  ...rolesPermitidos: string[]
): RequestHandler {
  return (
    request: Request,
    _response: Response,
    next: NextFunction,
  ): void => {
    if (!request.auth) {
      next(
        new AppError(
          401,
          "Debes iniciar sesión para acceder a este recurso.",
          "TOKEN_REQUERIDO",
        ),
      );

      return;
    }

    if (!rolesPermitidos.includes(request.auth.rol)) {
      next(
        new AppError(
          403,
          "No tienes permisos para realizar esta acción.",
          "ACCESO_DENEGADO",
        ),
      );

      return;
    }

    next();
  };
}