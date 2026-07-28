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
  userRouter,
} from "./modules/users/user.routes.js";

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

app.use((_request, response) => {
  response.status(404).json({
    success: false,
    message: "La ruta solicitada no existe.",
    code: "ROUTE_NOT_FOUND",
  });
});

app.use(errorMiddleware);