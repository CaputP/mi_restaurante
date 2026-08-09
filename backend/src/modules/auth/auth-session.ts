import {
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type {
  CookieOptions,
  NextFunction,
  Request,
  Response,
} from "express";

import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";

const productionCookiePrefix =
  env.AUTH_COOKIE_SECURE ? "__Host-" : "";

export const accessTokenCookieName =
  `${productionCookiePrefix}vallecito_session`;
const csrfCookieName =
  `${productionCookiePrefix}vallecito_csrf`;

const cookieLifetimeMs =
  env.JWT_EXPIRES_IN_SECONDS * 1_000;

const commonCookieOptions: CookieOptions = {
  secure: env.AUTH_COOKIE_SECURE,
  sameSite: env.AUTH_COOKIE_SAME_SITE,
  path: "/",
  maxAge: cookieLifetimeMs,
};

const csrfExemptPaths = new Set([
  "/api/auth/login",
  "/api/auth/google",
  "/api/auth/register",
  "/api/auth/email-verification/confirm",
  "/api/auth/password/forgot",
  "/api/auth/password/reset",
  "/api/v1/auth/login",
  "/api/v1/auth/google",
  "/api/v1/auth/register",
  "/api/v1/auth/email-verification/confirm",
  "/api/v1/auth/password/forgot",
  "/api/v1/auth/password/reset",
]);

function createCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

function setCsrfCookie(
  response: Response,
  csrfToken: string,
): void {
  response.cookie(
    csrfCookieName,
    csrfToken,
    {
      ...commonCookieOptions,
      httpOnly: false,
    },
  );
}

export function establishAuthSession(
  response: Response,
  accessToken: string,
): string {
  const csrfToken = createCsrfToken();

  response.cookie(
    accessTokenCookieName,
    accessToken,
    {
      ...commonCookieOptions,
      httpOnly: true,
    },
  );
  setCsrfCookie(response, csrfToken);

  return csrfToken;
}

export function ensureCsrfSession(
  request: Request,
  response: Response,
): string {
  const existingToken =
    request.cookies?.[csrfCookieName];

  if (
    typeof existingToken === "string" &&
    /^[A-Za-z0-9_-]{40,100}$/.test(existingToken)
  ) {
    return existingToken;
  }

  const csrfToken = createCsrfToken();
  setCsrfCookie(response, csrfToken);
  return csrfToken;
}

export function clearAuthSession(
  response: Response,
): void {
  const clearOptions: CookieOptions = {
    secure: commonCookieOptions.secure,
    sameSite: commonCookieOptions.sameSite,
    path: commonCookieOptions.path,
  };

  response.clearCookie(
    accessTokenCookieName,
    clearOptions,
  );
  response.clearCookie(
    csrfCookieName,
    clearOptions,
  );
}

function tokensMatch(
  cookieToken: string,
  headerToken: string,
): boolean {
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  return (
    cookieBuffer.length === headerBuffer.length &&
    timingSafeEqual(cookieBuffer, headerBuffer)
  );
}

export function requireCsrfProtection(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  if (
    ["GET", "HEAD", "OPTIONS"].includes(request.method) ||
    csrfExemptPaths.has(request.path) ||
    !request.cookies?.[accessTokenCookieName]
  ) {
    next();
    return;
  }

  const cookieToken = request.cookies?.[csrfCookieName];
  const headerToken = request.header("x-csrf-token");

  if (
    typeof cookieToken !== "string" ||
    typeof headerToken !== "string" ||
    !tokensMatch(cookieToken, headerToken)
  ) {
    next(
      new AppError(
        403,
        "La validación de seguridad de la solicitud falló.",
        "CSRF_TOKEN_INVALIDO",
      ),
    );
    return;
  }

  next();
}
