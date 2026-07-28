import { Router } from "express";

import {
  requireAuth,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  createUserController,
  getUserOptionsController,
  listUsersController,
  resetUserPasswordController,
  updateUserController,
  updateUserStatusController,
} from "./user.controller.js";

export const userRouter =
  Router();

userRouter.use(
  requireAuth,
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
);

userRouter.get(
  "/options",
  getUserOptionsController,
);

userRouter.get(
  "/",
  listUsersController,
);

userRouter.post(
  "/",
  createUserController,
);

userRouter.patch(
  "/:id",
  updateUserController,
);

userRouter.patch(
  "/:id/status",
  updateUserStatusController,
);

userRouter.patch(
  "/:id/password",
  resetUserPasswordController,
);