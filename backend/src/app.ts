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
import express from "express";

import { env } from "./config/env.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";

import {
  inventoryRouter,
} from "./modules/inventory/inventory.routes.js";

import {
  reservationRouter,
} from "./modules/reservations/reservation.routes.js";

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

export const app = express();

app.disable("x-powered-by");

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "1mb",
  }),
);

app.use(
  auditMutationMiddleware,
);

app.get("/api/health", (_request, response) => {
  response.status(200).json({
    success: true,
    message: "API de El Vallecito de Chocco funcionando.",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

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
  "/api/admin/reservations",
  reservationRouter,
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
  branchRouter,
);

app.use(
  "/api/branches",
  branchRouter,
);

app.use(
  "/api/branches",
  branchAvailabilityRouter,
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

app.use((_request, response) => {
  response.status(404).json({
    success: false,
    message: "La ruta solicitada no existe.",
    code: "ROUTE_NOT_FOUND",
  });
});

app.use(errorMiddleware);