import { Router } from "express";

import {
  requireAuth,
  requirePermissions,
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
  cancelClientReservationController,
  createClientReservationController,
  rescheduleReservationController,
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
  requirePermissions("RESERVA_CREAR"),
  getReservationOptionsController,
);

reservationRouter.get(
  "/availability",
  requirePermissions("RESERVA_CREAR"),
  checkReservationAvailabilityController,
);

reservationRouter.get(
  "/",
  requirePermissions("RESERVA_CREAR"),
  listReservationsController,
);

reservationRouter.post(
  "/",
  requirePermissions("RESERVA_CREAR"),
  createReservationController,
);

reservationRouter.patch(
  "/:id/review",
  requirePermissions("RESERVA_APROBAR"),
  reviewReservationController,
);

reservationRouter.patch(
  "/:id/approve",
  requirePermissions("RESERVA_APROBAR"),
  approveReservationController,
);

reservationRouter.patch(
  "/:id/reject",
  requirePermissions("RESERVA_APROBAR"),
  rejectReservationController,
);

reservationRouter.get(
  "/:id",
  requirePermissions("RESERVA_CREAR"),
  getReservationByIdController,
);

reservationRouter.post(
  "/:id/payments",
  requirePermissions("RESERVA_CREAR"),
  registerReservationPaymentController,
);

reservationRouter.patch(
  "/:id/payments/:paymentId/confirm",
  requirePermissions("RESERVA_APROBAR"),
  confirmReservationPaymentController,
);

reservationRouter.patch(
  "/:id/cancel",
  requirePermissions("RESERVA_CANCELAR"),
  cancelReservationController,
);

reservationRouter.patch(
  "/:id/reschedule",
  requirePermissions("RESERVA_CREAR"),
  rescheduleReservationController,
);

export const clientReservationRouter =
  Router();

clientReservationRouter.use(
  requireAuth,
  requireRoles("CLIENTE"),
);

clientReservationRouter.get(
  "/options",
  requirePermissions("RESERVA_CREAR"),
  getReservationOptionsController,
);

clientReservationRouter.get(
  "/availability",
  requirePermissions("RESERVA_CREAR"),
  checkReservationAvailabilityController,
);

clientReservationRouter.get(
  "/",
  requirePermissions("CLIENTE_HISTORIAL_VER"),
  listReservationsController,
);

clientReservationRouter.post(
  "/",
  requirePermissions("RESERVA_CREAR"),
  createClientReservationController,
);

clientReservationRouter.get(
  "/:id",
  requirePermissions("CLIENTE_HISTORIAL_VER"),
  getReservationByIdController,
);

clientReservationRouter.post(
  "/:id/payments",
  requirePermissions("RESERVA_CREAR"),
  registerReservationPaymentController,
);

clientReservationRouter.patch(
  "/:id/reschedule",
  requirePermissions("RESERVA_CREAR"),
  rescheduleReservationController,
);

clientReservationRouter.patch(
  "/:id/cancel",
  requirePermissions("RESERVA_CANCELAR"),
  cancelClientReservationController,
);
