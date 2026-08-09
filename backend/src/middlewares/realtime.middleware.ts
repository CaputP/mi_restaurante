import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  logger,
} from "../lib/logger.js";
import {
  publishRealtimeChange,
  type RealtimeResource,
} from "../modules/realtime/realtime-broker.js";

const MUTATION_METHODS =
  new Set([
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ]);

const RESOURCE_DEPENDENCIES: Record<
  string,
  RealtimeResource[]
> = {
  reservations: [
    "RESERVATIONS",
    "ORDERS",
    "INVENTORY",
    "REPORTS",
    "NOTIFICATIONS",
  ],
  orders: [
    "ORDERS",
    "COMMANDS",
    "DELIVERIES",
    "CASH",
    "REPORTS",
    "NOTIFICATIONS",
  ],
  commands: [
    "COMMANDS",
    "ORDERS",
    "DELIVERIES",
    "NOTIFICATIONS",
  ],
  deliveries: [
    "DELIVERIES",
    "ORDERS",
    "NOTIFICATIONS",
  ],
  cash: [
    "CASH",
    "SALES",
    "EXPENSES",
    "REPORTS",
  ],
  sales: [
    "SALES",
    "CASH",
    "ORDERS",
    "INVENTORY",
    "REPORTS",
    "LOYALTY",
    "NOTIFICATIONS",
  ],
  expenses: [
    "EXPENSES",
    "CASH",
    "REPORTS",
  ],
  inventory: [
    "INVENTORY",
    "CATALOG",
    "NOTIFICATIONS",
  ],
  catalog: [
    "CATALOG",
    "INVENTORY",
  ],
  loyalty: [
    "LOYALTY",
    "ORDERS",
    "NOTIFICATIONS",
  ],
  promotions: [
    "PROMOTIONS",
    "CATALOG",
    "ORDERS",
  ],
  notifications: [
    "NOTIFICATIONS",
  ],
  users: [
    "USERS",
    "ROLES",
  ],
  roles: [
    "ROLES",
    "USERS",
  ],
  branches: [
    "BRANCHES",
    "CATALOG",
    "RESERVATIONS",
  ],
  settings: [
    "SETTINGS",
  ],
  audit: [
    "AUDIT",
  ],
  "consumer-claims": [
    "CLAIMS",
    "NOTIFICATIONS",
    "AUDIT",
  ],
};

export function getRealtimeResources(
  requestPath: string,
): RealtimeResource[] {
  const segments =
    requestPath
      .split("?")[0]
      ?.split("/")
      .filter(Boolean) ?? [];

  const versionIndex =
    segments.findIndex(
      (segment) =>
        segment === "v1",
    );

  const apiIndex =
    segments.findIndex(
      (segment) =>
        segment === "api",
    );

  let moduleIndex =
    versionIndex >= 0
      ? versionIndex + 1
      : apiIndex + 1;

  if (
    segments[moduleIndex] ===
    "admin"
  ) {
    moduleIndex += 1;
  }

  const moduleName =
    segments[moduleIndex];

  return moduleName
    ? RESOURCE_DEPENDENCIES[
        moduleName
      ] ?? []
    : [];
}

export function realtimeMutationMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (
    !MUTATION_METHODS.has(
      request.method,
    )
  ) {
    next();
    return;
  }

  response.once(
    "finish",
    () => {
      if (
        response.statusCode < 200 ||
        response.statusCode >= 400 ||
        !request.auth
      ) {
        return;
      }

      const resources =
        getRealtimeResources(
          request.originalUrl,
        );

      void publishRealtimeChange(
        [
          ...resources,
          "AUDIT",
        ],
      ).catch(
        (error: unknown) => {
          logger.warn(
            {
              error,
              resources,
            },
            "No se pudo notificar un cambio del sistema.",
          );
        },
      );
    },
  );

  next();
}
