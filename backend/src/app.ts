import {
  notificationRouter,
} from "./modules/notifications/notifications.routes.js";

import {
  catalogRouter,
} from "./modules/catalog/catalog.routes.js";

import {
  dashboardRouter,
} from "./modules/dashboard/dashboard.routes.js";

import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";

import { env } from "./config/env.js";
import { Prisma } from "./generated/prisma/client.js";
import { prisma } from "./lib/prisma.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import {
  apiRateLimiter,
  requestLogger,
  securityHeaders,
} from "./middlewares/security.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";

import {
  inventoryRouter,
} from "./modules/inventory/inventory.routes.js";

import {
  clientReservationRouter,
  reservationRouter,
} from "./modules/reservations/reservation.routes.js";
import { backupRouter } from "./modules/backups/backup.routes.js";

import {
  orderRouter,
} from "./modules/orders/order.routes.js";

import {
  commandRouter,
} from "./modules/commands/command.routes.js";

import {
  deliveryRouter,
} from "./modules/deliveries/delivery.routes.js";

import {
  userRouter,
} from "./modules/users/user.routes.js";
import { roleRouter } from "./modules/roles/role.routes.js";

import {
  cashRouter,
} from "./modules/cash/cash.routes.js";

import {
  saleRouter,
} from "./modules/sales/sale.routes.js";

import {
  expenseRouter,
} from "./modules/expenses/expense.routes.js";

import {
  reportRouter,
} from "./modules/reports/report.routes.js";

import {
  branchRouter,
} from "./modules/branches/branch.routes.js";

import {
  settingRouter,
} from "./modules/settings/setting.routes.js";

import {
  auditMutationMiddleware,
} from "./middlewares/audit.middleware.js";

import {
  auditRouter,
} from "./modules/audit/audit.routes.js";

import {
  AppError,
} from "./shared/errors/app-error.js";

import {
  ticketRouter,
} from "./modules/tickets/ticket.routes.js";

import {
  branchAvailabilityRouter,
} from "./modules/branch-availability/branch-availability.routes.js";

import {
  saleVoidRouter,
} from "./modules/sale-void/sale-void.routes.js";

import {
  loyaltyRouter,
} from "./modules/loyalty/loyalty.routes.js";

import {
  promotionRouter,
} from "./modules/promotions/promotions.routes.js";
import { requireCsrfProtection } from "./modules/auth/auth-session.js";
import {
  consumerClaimAdminRouter,
  consumerClaimPublicRouter,
} from "./modules/consumer-claims/consumer-claim.routes.js";
import {
  realtimeMutationMiddleware,
} from "./middlewares/realtime.middleware.js";
import {
  realtimeRouter,
} from "./modules/realtime/realtime.routes.js";
import {
  adminReviewRouter,
  clientReviewRouter,
  publicReviewRouter,
} from "./modules/reviews/review.routes.js";

export const app = express();

const frontendOrigin =
  new URL(
    env.FRONTEND_URL,
  ).origin;

app.disable("x-powered-by");
app.set(
  "trust proxy",
  env.TRUST_PROXY_HOPS,
);
app.set(
  "query parser",
  "simple",
);

app.use(requestLogger);
app.use(securityHeaders);

app.use(
  cors({
    origin: (
      origin,
      callback,
    ) => {
      if (
        !origin ||
        origin ===
          frontendOrigin
      ) {
        callback(
          null,
          true,
        );
        return;
      }

      callback(
        new AppError(
          403,
          "El origen de la solicitud no está permitido.",
          "ORIGIN_NOT_ALLOWED",
        ),
      );
    },
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "X-CSRF-Token",
      "X-Request-Id",
    ],
    exposedHeaders: [
      "X-Request-Id",
      "RateLimit",
      "RateLimit-Policy",
    ],
    maxAge: 86_400,
  }),
);

app.use(cookieParser());

app.use(
  "/api",
  apiRateLimiter,
);

app.use(
  express.json({
    limit: "1mb",
  }),
);

app.use(requireCsrfProtection);

app.use(
  auditMutationMiddleware,
);

app.use(
  realtimeMutationMiddleware,
);

app.get("/api/health", (_request, response) => {
  response.status(200).json({
    success: true,
    message: "API de El Vallecito de Chocco funcionando.",
    timestamp: new Date().toISOString(),
  });
});

app.get(
  "/api/ready",
  async (
    _request,
    response,
    next,
  ) => {
    try {
      await prisma.$queryRaw(
        Prisma.sql`SELECT 1`,
      );

      response.status(200).json({
        success: true,
        message:
          "API y base de datos disponibles.",
        timestamp:
          new Date().toISOString(),
      });
    } catch (error: unknown) {
      next(error);
    }
  },
);

app.use("/api/auth", authRouter);

app.use(
  "/api/admin/dashboard",
  dashboardRouter,
);

app.use(
  "/api/admin/catalog",
  catalogRouter,
);

app.use(
  "/api/admin/inventory",
  inventoryRouter,
);

app.use(
  "/api/admin/users",
  userRouter,
);

app.use(
  "/api/admin/roles",
  roleRouter,
);

app.use(
  "/api/admin/reservations",
  reservationRouter,
);

app.use(
  "/api/reservations",
  clientReservationRouter,
);

app.use(
  "/api/orders",
  orderRouter,
);

app.use(
  "/api/commands",
  commandRouter,
);

app.use(
  "/api/deliveries",
  deliveryRouter,
);

app.use(
  "/api/cash",
  cashRouter,
);

app.use(
  "/api/sales",
  saleRouter,
);

app.use(
  "/api/sales",
  saleVoidRouter,
);

app.use(
  "/api/expenses",
  expenseRouter,
);

app.use(
  "/api/reports",
  reportRouter,
);

app.use(
  "/api/branches",
  branchAvailabilityRouter,
);

app.use(
  "/api/branches",
  branchRouter,
);

app.use(
  "/api/settings",
  settingRouter,
);

app.use(
  "/api/audit",
  auditRouter,
);

app.use(
  "/api/tickets",
  ticketRouter,
);

app.use(
  "/api/loyalty",
  loyaltyRouter,
);

app.use(
  "/api/promotions",
  promotionRouter,
);

app.use(
  "/api/notifications",
  notificationRouter,
);

app.use(
  "/api/realtime",
  realtimeRouter,
);

app.use("/api/reviews", publicReviewRouter);
app.use("/api/reviews", clientReviewRouter);
app.use("/api/admin/reviews", adminReviewRouter);

app.use(
  "/api/backups",
  backupRouter,
);
app.use("/api/consumer-claims", consumerClaimPublicRouter);
app.use("/api/admin/consumer-claims", consumerClaimAdminRouter);

app.use(
  "/api/v1",
  (_request, response, next) => {
    response.setHeader(
      "x-api-version",
      "1",
    );
    next();
  },
);

app.get("/api/v1/health", (_request, response) => {
  response.status(200).json({
    success: true,
    message: "API de El Vallecito de Chocco funcionando.",
    version: "1",
    timestamp: new Date().toISOString(),
  });
});

app.get(
  "/api/v1/ready",
  async (_request, response, next) => {
    try {
      await prisma.$queryRaw(
        Prisma.sql`SELECT 1`,
      );
      response.status(200).json({
        success: true,
        message:
          "API y base de datos disponibles.",
        version: "1",
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      next(error);
    }
  },
);

app.use("/api/v1/auth", authRouter);
app.use(
  "/api/v1/admin/dashboard",
  dashboardRouter,
);
app.use(
  "/api/v1/admin/catalog",
  catalogRouter,
);
app.use(
  "/api/v1/admin/inventory",
  inventoryRouter,
);
app.use(
  "/api/v1/admin/users",
  userRouter,
);
app.use(
  "/api/v1/admin/roles",
  roleRouter,
);
app.use(
  "/api/v1/admin/reservations",
  reservationRouter,
);
app.use(
  "/api/v1/reservations",
  clientReservationRouter,
);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/commands", commandRouter);
app.use("/api/v1/deliveries", deliveryRouter);
app.use("/api/v1/cash", cashRouter);
app.use("/api/v1/sales", saleRouter);
app.use("/api/v1/sales", saleVoidRouter);
app.use("/api/v1/expenses", expenseRouter);
app.use("/api/v1/reports", reportRouter);
app.use(
  "/api/v1/branches",
  branchAvailabilityRouter,
);
app.use("/api/v1/branches", branchRouter);
app.use("/api/v1/settings", settingRouter);
app.use("/api/v1/audit", auditRouter);
app.use("/api/v1/tickets", ticketRouter);
app.use("/api/v1/loyalty", loyaltyRouter);
app.use("/api/v1/promotions", promotionRouter);
app.use(
  "/api/v1/notifications",
  notificationRouter,
);
app.use(
  "/api/v1/realtime",
  realtimeRouter,
);
app.use("/api/v1/reviews", publicReviewRouter);
app.use("/api/v1/reviews", clientReviewRouter);
app.use("/api/v1/admin/reviews", adminReviewRouter);
app.use("/api/v1/backups", backupRouter);
app.use("/api/v1/consumer-claims", consumerClaimPublicRouter);
app.use("/api/v1/admin/consumer-claims", consumerClaimAdminRouter);

app.use((_request, response) => {
  response.status(404).json({
    success: false,
    message: "La ruta solicitada no existe.",
    code: "ROUTE_NOT_FOUND",
  });
});

app.use(errorMiddleware);
