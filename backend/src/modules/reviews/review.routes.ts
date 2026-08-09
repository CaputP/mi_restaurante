import {
  Router,
} from "express";
import rateLimit from "express-rate-limit";
import {
  requireAuth,
  requirePermissions,
  requireRoles,
} from "../../middlewares/auth.middleware.js";
import {
  createReviewController,
  listAdminReviewsController,
  listClientSalesForReviewController,
  listPublicReviewsController,
  moderateReviewController,
} from "./review.controller.js";

export const publicReviewRouter =
  Router();
export const clientReviewRouter =
  Router();
export const adminReviewRouter =
  Router();

const reviewSubmissionLimiter =
  rateLimit({
    windowMs:
      60 * 60 * 1000,
    limit:
      10,
    standardHeaders:
      "draft-8",
    legacyHeaders:
      false,
    message: {
      success:
        false,
      message:
        "Alcanzaste el límite temporal de opiniones. Inténtalo más tarde.",
      code:
        "RESENA_RATE_LIMIT",
    },
  });

publicReviewRouter.get(
  "/public",
  listPublicReviewsController,
);

clientReviewRouter.use(
  requireAuth,
  requireRoles("CLIENTE"),
);
clientReviewRouter.get(
  "/my-sales",
  listClientSalesForReviewController,
);
clientReviewRouter.post(
  "/",
  reviewSubmissionLimiter,
  createReviewController,
);

adminReviewRouter.use(
  requireAuth,
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
  requirePermissions(
    "RESENA_GESTIONAR",
  ),
);
adminReviewRouter.get(
  "/",
  listAdminReviewsController,
);
adminReviewRouter.patch(
  "/:id",
  moderateReviewController,
);
