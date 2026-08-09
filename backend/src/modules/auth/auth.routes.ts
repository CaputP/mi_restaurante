import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  authenticationRateLimiter,
} from "../../middlewares/security.middleware.js";
import {
  acceptLegalController,
  confirmEmailController,
  forgotPasswordController,
  googleLoginController,
  loginController,
  logoutController,
  meController,
  registerController,
  renewSessionController,
  requestEmailVerificationController,
  resetPasswordController,
} from "./auth.controller.js";



export const authRouter = Router();

authRouter.post(
  "/login",
  authenticationRateLimiter,
  loginController,
);
authRouter.post(
  "/google",
  authenticationRateLimiter,
  googleLoginController,
);
authRouter.post(
  "/register",
  authenticationRateLimiter,
  registerController,
);

authRouter.post(
  "/email-verification/request",
  requireAuth,
  requestEmailVerificationController,
);

authRouter.post(
  "/email-verification/confirm",
  authenticationRateLimiter,
  confirmEmailController,
);

authRouter.post(
  "/password/forgot",
  authenticationRateLimiter,
  forgotPasswordController,
);

authRouter.post(
  "/password/reset",
  authenticationRateLimiter,
  resetPasswordController,
);

authRouter.get(
  "/me",
  requireAuth,
  meController,
);

authRouter.post(
  "/legal-acceptance",
  requireAuth,
  acceptLegalController,
);

authRouter.post(
  "/logout",
  requireAuth,
  logoutController,
);

authRouter.post(
  "/session/renew",
  requireAuth,
  renewSessionController,
);
