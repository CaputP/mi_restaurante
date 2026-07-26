import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  confirmEmailController,
  forgotPasswordController,
  googleLoginController,
  loginController,
  meController,
  registerController,
  requestEmailVerificationController,
  resetPasswordController,
} from "./auth.controller.js";



export const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.post(
  "/google",
  googleLoginController,
);
authRouter.post("/register", registerController);

authRouter.post(
  "/email-verification/request",
  requireAuth,
  requestEmailVerificationController,
);

authRouter.post(
  "/email-verification/confirm",
  confirmEmailController,
);

authRouter.post(
  "/password/forgot",
  forgotPasswordController,
);

authRouter.post(
  "/password/reset",
  resetPasswordController,
);

authRouter.get(
  "/me",
  requireAuth,
  meController,
);