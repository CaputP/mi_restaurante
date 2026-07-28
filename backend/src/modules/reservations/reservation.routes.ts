import { Router } from "express";

import {
  requireAuth,
  requireRoles,
} from "../../middlewares/auth.middleware.js";

import {
  checkReservationAvailabilityController,
  createReservationController,
  getReservationByIdController,
  getReservationOptionsController,
  listReservationsController,
  approveReservationController,
  rejectReservationController,
  reviewReservationController,
  cancelReservationController,
  confirmReservationPaymentController,
  registerReservationPaymentController,
} from "./reservation.controller.js";

export const reservationRouter =
  Router();

reservationRouter.use(
  requireAuth,
  requireRoles(
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
  ),
);

reservationRouter.get(
  "/options",
  getReservationOptionsController,
);

reservationRouter.get(
  "/availability",
  checkReservationAvailabilityController,
);

reservationRouter.get(
  "/",
  listReservationsController,
);

reservationRouter.post(
  "/",
  createReservationController,
);

reservationRouter.patch(
  "/:id/review",
  reviewReservationController,
);

reservationRouter.patch(
  "/:id/approve",
  approveReservationController,
);

reservationRouter.patch(
  "/:id/reject",
  rejectReservationController,
);

reservationRouter.get(
  "/:id",
  getReservationByIdController,
);

reservationRouter.post(
  "/:id/payments",
  registerReservationPaymentController,
);

reservationRouter.patch(
  "/:id/payments/:paymentId/confirm",
  confirmReservationPaymentController,
);

reservationRouter.patch(
  "/:id/cancel",
  cancelReservationController,
);