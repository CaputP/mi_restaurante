import { Prisma } from "../../generated/prisma/client.js";
import { withSerializableTransaction } from "../../lib/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  assertPaymentOperationsAvailable,
  normalizePaymentOperationNumber,
} from "../../shared/payments/payment-operation.utils.js";
import {
  calculateRemainingRequiredAdvance,
  hasOutstandingRequiredAdvance,
  RESERVATION_PAYMENT_EPSILON,
} from "../../shared/reservations/reservation-payment-policy.js";
import {
  closeReservationPaymentPendingNotifications,
  createReservationConfirmedNotification,
  createReservationPaymentPendingNotifications,
} from "../notifications/reservation-notification.service.js";
import type {
  ConfirmReservationPaymentInput,
  RegisterReservationPaymentInput,
} from "./reservation.schema.js";
import {
  getReservationById,
  getReservationForOperation,
} from "./reservation.service.js";
import type { ReservationAuth } from "./reservation.service.js";

const PAYABLE_STATES = ["ESPERANDO_ADELANTO", "CONFIRMADA"] as const;

async function lockReservationPaymentState(
  transaction: Prisma.TransactionClient,
  reservationId: string,
) {
  const lockedRows = await transaction.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT "id"
      FROM "reserva"
      WHERE "id" = ${reservationId}::uuid
      FOR UPDATE
    `,
  );

  if (lockedRows.length !== 1) {
    throw new AppError(404, "La reserva no existe.", "RESERVA_NO_ENCONTRADA");
  }

  const reservation = await transaction.reserva.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      codigo: true,
      sucursalId: true,
      estado: true,
      totalEstimado: true,
      adelantoRequerido: true,
    },
  });

  if (!reservation) {
    throw new AppError(404, "La reserva no existe.", "RESERVA_NO_ENCONTRADA");
  }

  return reservation;
}

function assertReservationAcceptsPayments(state: string): void {
  if (!PAYABLE_STATES.includes(state as (typeof PAYABLE_STATES)[number])) {
    throw new AppError(
      409,
      "La reserva todavía no puede recibir pagos.",
      "ESTADO_RESERVA_INVALIDO",
    );
  }
}

export async function registerReservationPayment(
  auth: ReservationAuth,
  reservationId: string,
  input: RegisterReservationPaymentInput,
) {
  await getReservationForOperation(auth, reservationId);

  await withSerializableTransaction(async (transaction) => {
    const reservation = await lockReservationPaymentState(transaction, reservationId);
    assertReservationAcceptsPayments(reservation.estado);

    const operationNumber = input.numeroOperacion
      ? normalizePaymentOperationNumber(input.numeroOperacion)
      : null;

    if (input.metodoPago !== "EFECTIVO" && !operationNumber) {
      throw new AppError(
        400,
        "El número de operación es obligatorio para pagos electrónicos.",
        "NUMERO_OPERACION_REQUERIDO",
      );
    }

    const committedPayments = await transaction.pagoReserva.aggregate({
      where: {
        reservaId: reservation.id,
        estado: { in: ["PENDIENTE", "CONFIRMADO"] },
      },
      _sum: { monto: true },
    });
    const committedAmount =
      Number(committedPayments._sum.monto ?? 0);
    const availableAdvance =
      calculateRemainingRequiredAdvance(
        Number(reservation.adelantoRequerido),
        committedAmount,
      );

    if (!hasOutstandingRequiredAdvance(availableAdvance)) {
      throw new AppError(
        409,
        "El adelanto solicitado ya se encuentra cubierto.",
        "ADELANTO_RESERVA_COMPLETO",
      );
    }

    if (input.monto > availableAdvance + RESERVATION_PAYMENT_EPSILON) {
      throw new AppError(
        400,
        `El pago no puede superar el adelanto pendiente de S/ ${availableAdvance.toFixed(2)}.`,
        "PAGO_SUPERA_ADELANTO",
      );
    }

    if (operationNumber) {
      await assertPaymentOperationsAvailable(transaction, [operationNumber]);
    }

    await transaction.pagoReserva.create({
      data: {
        reservaId: reservation.id,
        registradoPorId: auth.usuarioId,
        metodoPago: input.metodoPago,
        monto: input.monto,
        numeroOperacion: operationNumber,
        observaciones: input.observaciones,
        estado: "PENDIENTE",
      },
    });

    await createReservationPaymentPendingNotifications(
      transaction,
      {
        reservationId:
          reservation.id,
        reservationCode:
          reservation.codigo,
        branchId:
          reservation.sucursalId,
        paymentMethod:
          input.metodoPago,
        amount:
          input.monto,
      },
    );
  });

  return getReservationById(auth, reservationId);
}

export async function confirmReservationPayment(
  auth: ReservationAuth,
  reservationId: string,
  paymentId: string,
  input: ConfirmReservationPaymentInput,
) {
  await getReservationForOperation(auth, reservationId);

  await withSerializableTransaction(async (transaction) => {
    const reservation = await lockReservationPaymentState(transaction, reservationId);
    assertReservationAcceptsPayments(reservation.estado);

    const paymentUpdate = await transaction.pagoReserva.updateMany({
      where: {
        id: paymentId,
        reservaId: reservation.id,
        estado: "PENDIENTE",
      },
      data: {
        estado: "CONFIRMADO",
        confirmadoPorId: auth.usuarioId,
        fechaConfirmacion: new Date(),
        ...(input.observacion ? { observaciones: input.observacion } : {}),
      },
    });

    if (paymentUpdate.count !== 1) {
      const existingPayment = await transaction.pagoReserva.findFirst({
        where: { id: paymentId, reservaId: reservation.id },
        select: { id: true },
      });

      if (!existingPayment) {
        throw new AppError(
          404,
          "El pago no existe o no pertenece a la reserva.",
          "PAGO_NO_ENCONTRADO",
        );
      }
      throw new AppError(409, "El pago ya fue procesado anteriormente.", "PAGO_YA_PROCESADO");
    }

    const paymentTotal = await transaction.pagoReserva.aggregate({
      where: { reservaId: reservation.id, estado: "CONFIRMADO" },
      _sum: { monto: true },
    });
    const confirmedAmount = Number(paymentTotal._sum.monto ?? 0);
    const requiredAdvance = Number(reservation.adelantoRequerido);
    const estimatedTotal = Number(reservation.totalEstimado);

    if (confirmedAmount > estimatedTotal + RESERVATION_PAYMENT_EPSILON) {
      throw new AppError(
        409,
        "Los pagos confirmados superan el total de la reserva.",
        "PAGOS_RESERVA_EXCEDIDOS",
      );
    }

    const nextStatus =
      reservation.estado === "ESPERANDO_ADELANTO" && confirmedAmount >= requiredAdvance
        ? "CONFIRMADA"
        : reservation.estado;

    await transaction.reserva.update({
      where: { id: reservation.id },
      data: {
        adelantoPagado: confirmedAmount,
        saldoEstimado: Math.max(0, estimatedTotal - confirmedAmount),
        estado: nextStatus,
      },
    });

    const remainingPendingPayments =
      await transaction
        .pagoReserva
        .count({
          where: {
            reservaId:
              reservation.id,
            estado:
              "PENDIENTE",
          },
        });

    if (
      remainingPendingPayments ===
      0
    ) {
      await closeReservationPaymentPendingNotifications(
        transaction,
        reservation.id,
      );
    }

    if (nextStatus !== reservation.estado) {
      await transaction.historialReserva.create({
        data: {
          reservaId: reservation.id,
          usuarioId: auth.usuarioId,
          estadoAnterior: reservation.estado,
          estadoNuevo: nextStatus,
          observacion:
            input.observacion ?? "Adelanto confirmado. La reserva quedó confirmada.",
        },
      });
      await createReservationConfirmedNotification(transaction, reservation.id);
    }
  });

  return getReservationById(auth, reservationId);
}
