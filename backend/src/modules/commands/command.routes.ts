import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  completeCommandController,
  getCommandByIdController,
  getCommandOptionsController,
  listCommandsController,
  startCommandController,
} from "./command.controller.js";

export const commandRouter =
  Router();

commandRouter.use(
  requireAuth,
);

commandRouter.use(
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
    "COCINA",
  ),
);

commandRouter.get(
  "/options",
  requirePermissions("COMANDA_VER"),
  getCommandOptionsController,
);

commandRouter.get(
  "/",
  requirePermissions("COMANDA_VER"),
  listCommandsController,
);

commandRouter.patch(
  "/:id/start",
  requirePermissions("COMANDA_PROCESAR"),
  startCommandController,
);

commandRouter.patch(
  "/:id/complete",
  requirePermissions("COMANDA_PROCESAR"),
  completeCommandController,
);

commandRouter.get(
  "/:id",
  requirePermissions("COMANDA_VER"),
  getCommandByIdController,
);
