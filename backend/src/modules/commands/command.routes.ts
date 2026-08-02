import { Router } from "express";

import {
  requireAuth,
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
  getCommandOptionsController,
);

commandRouter.get(
  "/",
  listCommandsController,
);

commandRouter.patch(
  "/:id/start",
  startCommandController,
);

commandRouter.patch(
  "/:id/complete",
  completeCommandController,
);

commandRouter.get(
  "/:id",
  getCommandByIdController,
);