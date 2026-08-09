import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  AppError,
} from "../../shared/errors/app-error.js";
import {
  canSubscribeRealtimeUser,
  subscribeRealtimeClient,
} from "./realtime-broker.js";

export function realtimeEventsController(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (!request.auth) {
    next(
      new AppError(
        401,
        "Debes iniciar sesión.",
        "TOKEN_REQUERIDO",
      ),
    );
    return;
  }

  if (
    !canSubscribeRealtimeUser(
      request.auth.usuarioId,
    )
  ) {
    next(
      new AppError(
        429,
        "Se alcanzó el límite de conexiones en tiempo real.",
        "REALTIME_CONNECTION_LIMIT",
      ),
    );
    return;
  }

  response.status(200);
  response.set({
    "content-type":
      "text/event-stream; charset=utf-8",
    "cache-control":
      "private, no-cache, no-store, no-transform",
    connection:
      "keep-alive",
    "x-accel-buffering":
      "no",
  });
  response.flushHeaders();

  const unsubscribe =
    subscribeRealtimeClient(
      request.auth.usuarioId,
      response,
    );

  request.once(
    "close",
    unsubscribe,
  );
  response.once(
    "close",
    unsubscribe,
  );
}
