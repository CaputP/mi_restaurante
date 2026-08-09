import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, requirePermissions, requireRoles } from "../../middlewares/auth.middleware.js";
import {
  createController,
  getController,
  listController,
  optionsController,
  receiptController,
  updateController,
} from "./consumer-claim.controller.js";

export const consumerClaimPublicRouter = Router();
export const consumerClaimAdminRouter = Router();

const complaintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Alcanzaste el límite temporal de envíos. Inténtalo nuevamente más tarde.",
    code: "RECLAMO_RATE_LIMIT",
  },
});

consumerClaimPublicRouter.get("/options", optionsController);
consumerClaimPublicRouter.get("/:codigo/receipt", receiptController);
consumerClaimPublicRouter.post("/", complaintLimiter, createController);

consumerClaimAdminRouter.use(
  requireAuth,
  requireRoles("ADMINISTRADOR_GENERAL", "ADMINISTRADOR_SUCURSAL"),
  requirePermissions("RECLAMO_GESTIONAR"),
);
consumerClaimAdminRouter.get("/", listController);
consumerClaimAdminRouter.get("/:id", getController);
consumerClaimAdminRouter.patch("/:id", updateController);
