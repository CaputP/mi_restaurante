import { Router } from "express";

import {
  requireAuth,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  getSaleTicketController,
} from "./ticket.controller.js";

export const ticketRouter =
  Router();

ticketRouter.use(
  requireAuth,
);

ticketRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
  ),
);

ticketRouter.get(
  "/sales/:id",
  getSaleTicketController,
);