import {
  randomUUID,
} from "node:crypto";

import type {
  Request,
  Response,
} from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import {
  pinoHttp,
} from "pino-http";

import {
  env,
} from "../config/env.js";
import {
  logger,
} from "../lib/logger.js";

export const securityHeaders =
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [
          "'none'",
        ],

        frameAncestors: [
          "'none'",
        ],
      },
    },

    crossOriginEmbedderPolicy:
      false,
  });

export const requestLogger =
  pinoHttp<
    Request,
    Response
  >({
    logger,

    genReqId: (
      request: Request,
      response: Response,
    ) => {
      const incomingId =
        request.headers[
          "x-request-id"
        ];

      const requestId =
        typeof incomingId ===
          "string" &&
        incomingId.length <= 100
          ? incomingId
          : randomUUID();

      response.setHeader(
        "x-request-id",
        requestId,
      );

      return requestId;
    },

    customLogLevel: (
      _request,
      response,
      error,
    ) => {
      if (
        error ||
        response.statusCode >= 500
      ) {
        return "error";
      }

      if (
        response.statusCode >= 400
      ) {
        return "warn";
      }

      return "info";
    },

  });

function rateLimitMessage(
  message: string,
) {
  return {
    success: false,
    message,
    code:
      "RATE_LIMIT_EXCEEDED",
  };
}

export const apiRateLimiter =
  rateLimit({
    windowMs:
      env.RATE_LIMIT_WINDOW_MS,

    limit:
      env.API_RATE_LIMIT_MAX,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message:
      rateLimitMessage(
        "Se realizaron demasiadas solicitudes. Inténtalo nuevamente en unos minutos.",
      ),
  });

export const authenticationRateLimiter =
  rateLimit({
    windowMs:
      env.AUTH_RATE_LIMIT_WINDOW_MS,

    limit:
      env.AUTH_RATE_LIMIT_MAX,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message:
      rateLimitMessage(
        "Se realizaron demasiados intentos. Espera antes de volver a intentarlo.",
      ),
  });
