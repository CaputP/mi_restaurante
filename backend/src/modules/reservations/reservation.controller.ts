import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  createReservationSchema,
  listReservationsQuerySchema,
  reservationAvailabilityQuerySchema,
  reservationIdSchema,
  reservationOptionsQuerySchema,
  approveReservationSchema,
  rejectReservationSchema,
  reviewReservationSchema,
  cancelReservationSchema,
  confirmReservationPaymentSchema,
  registerReservationPaymentSchema,
  reservationPaymentIdSchema,
  cancelClientReservationSchema,
  createClientReservationSchema,
  rescheduleReservationSchema,
} from "./reservation.schema.js";

import {
  cancelReservation,
  checkReservationAvailability,
  createReservation,
  getReservationById,
  getReservationOptions,
  listReservations,
  approveReservation,
  rejectReservation,
  reviewReservation,
  rescheduleReservation,
} from "./reservation.service.js";

import {
  confirmReservationPayment,
  registerReservationPayment,
} from "./reservation-payment.service.js";

function getRequestAuth(
  request: Request,
) {
  if (!request.auth) {
    throw new AppError(
      401,
      "Debes iniciar sesión.",
      "TOKEN_REQUERIDO",
    );
  }

  return {
    usuarioId:
      request.auth.usuarioId,

    rol:
      request.auth.rol,
  };
}

export async function registerReservationPaymentController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      reservationIdSchema.parse(
        request.params,
      );

    const input =
      registerReservationPaymentSchema
        .parse(
          request.body,
        );

    const reservation =
      await registerReservationPayment(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Pago registrado. Se encuentra pendiente de confirmación.",
      data: {
        reserva:
          reservation,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function confirmReservationPaymentController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
      paymentId,
    } =
      reservationPaymentIdSchema
        .parse(
          request.params,
        );

    const input =
      confirmReservationPaymentSchema
        .parse(
          request.body,
        );

    const reservation =
      await confirmReservationPayment(
        getRequestAuth(request),
        id,
        paymentId,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        reservation.estado ===
        "CONFIRMADA"
          ? "Pago confirmado y reserva confirmada."
          : "Pago confirmado correctamente.",

      data: {
        reserva:
          reservation,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function cancelReservationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      reservationIdSchema.parse(
        request.params,
      );

    const input =
      cancelReservationSchema.parse(
        request.body,
      );

    const reservation =
      await cancelReservation(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Reserva cancelada y stock comprometido liberado correctamente.",
      data: {
        reserva:
          reservation,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getReservationOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      reservationOptionsQuerySchema
        .parse(
          request.query,
        );

    const options =
      await getReservationOptions(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Opciones de reservas obtenidas correctamente.",
      data: options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function checkReservationAvailabilityController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      reservationAvailabilityQuerySchema
        .parse(
          request.query,
        );

    const availability =
      await checkReservationAvailability(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        availability.disponible
          ? "El horario se encuentra disponible."
          : "El horario no se encuentra disponible.",

      data: availability,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listReservationsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listReservationsQuerySchema
        .parse(
          request.query,
        );

    const result =
      await listReservations(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Reservas obtenidas correctamente.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getReservationByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      reservationIdSchema.parse(
        request.params,
      );

    const reservation =
      await getReservationById(
        getRequestAuth(request),
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Reserva obtenida correctamente.",
      data: {
        reserva:
          reservation,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createReservationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createReservationSchema.parse(
        request.body,
      );

    const reservation =
      await createReservation(
        getRequestAuth(request),
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Reserva registrada correctamente.",
      data: {
        reserva:
          reservation,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function reviewReservationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      reservationIdSchema.parse(
        request.params,
      );

    const input =
      reviewReservationSchema.parse(
        request.body,
      );

    const reservation =
      await reviewReservation(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "La reserva pasó a revisión.",
      data: {
        reserva:
          reservation,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function approveReservationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      reservationIdSchema.parse(
        request.params,
      );

    const input =
      approveReservationSchema.parse(
        request.body,
      );

    const reservation =
      await approveReservation(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        reservation.estado ===
        "ESPERANDO_ADELANTO"
          ? "Reserva aprobada. Se encuentra esperando el adelanto."
          : "Reserva aprobada y confirmada.",

      data: {
        reserva:
          reservation,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function rejectReservationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      reservationIdSchema.parse(
        request.params,
      );

    const input =
      rejectReservationSchema.parse(
        request.body,
      );

    const reservation =
      await rejectReservation(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Reserva rechazada correctamente.",
      data: {
        reserva:
          reservation,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createClientReservationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getRequestAuth(request);
    const input =
      createClientReservationSchema.parse(
        request.body,
      );

    const reservation =
      await createReservation(
        auth,
        {
          ...input,
          clienteId: auth.usuarioId,
          adelantoRequerido: 0,
        },
      );

    response.status(201).json({
      success: true,
      message:
        "Tu solicitud de reserva fue registrada correctamente.",
      data: {
        reserva: reservation,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function cancelClientReservationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      reservationIdSchema.parse(
        request.params,
      );
    const input =
      cancelClientReservationSchema.parse(
        request.body,
      );

    const reservation =
      await cancelReservation(
        getRequestAuth(request),
        id,
        {
          ...input,
          penalidadCancelacion: 0,
        },
      );

    response.status(200).json({
      success: true,
      message:
        "Tu reserva fue cancelada correctamente.",
      data: {
        reserva: reservation,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function rescheduleReservationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      reservationIdSchema.parse(
        request.params,
      );
    const input =
      rescheduleReservationSchema.parse(
        request.body,
      );

    const reservation =
      await rescheduleReservation(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Reserva reprogramada correctamente.",
      data: {
        reserva: reservation,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}
