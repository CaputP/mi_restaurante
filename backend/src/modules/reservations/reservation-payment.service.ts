import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
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

    await transaction.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT "id"
        FROM "pago_reserva"
        WHERE "id" = ${paymentId}::uuid
          AND "reserva_id" = ${reservation.id}::uuid
        FOR UPDATE
      `,
    );

    const pendingPayment = await transaction.pagoReserva.findFirst({
      where: {
        id: paymentId,
        reservaId: reservation.id,
        estado: "PENDIENTE",
      },
      select: {
        id: true,
        metodoPago: true,
        monto: true,
      },
    });

    if (!pendingPayment) {
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

    const lockedCashRows = await transaction.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT "id"
        FROM "caja"
        WHERE "id" = ${input.cajaId}::uuid
        FOR UPDATE
      `,
    );

    const cash = lockedCashRows.length === 1
      ? await transaction.caja.findUnique({
        where: { id: input.cajaId },
        select: {
          id: true,
          codigo: true,
          sucursalId: true,
          estado: true,
        },
      })
      : null;

    if (
      !cash ||
      cash.estado !== "ABIERTA" ||
      cash.sucursalId !== reservation.sucursalId
    ) {
      throw new AppError(
        409,
        "La caja seleccionada no está abierta o no pertenece a la sucursal de la reserva.",
        "CAJA_ADELANTO_INVALIDA",
      );
    }

    const correlativo = await transaction.correlativo.upsert({
      where: {
        sucursalId_tipoDocumento: {
          sucursalId: reservation.sucursalId,
          tipoDocumento: "CONSTANCIA_RESERVA",
        },
      },
      update: { ultimoNumero: { increment: 1 } },
      create: {
        sucursalId: reservation.sucursalId,
        tipoDocumento: "CONSTANCIA_RESERVA",
        prefijo: "AR",
        ultimoNumero: 1n,
        longitudNumero: 6,
      },
      select: {
        prefijo: true,
        ultimoNumero: true,
        longitudNumero: true,
      },
    });

    const receiptNumber = `${correlativo.prefijo}-${correlativo.ultimoNumero
      .toString()
      .padStart(correlativo.longitudNumero, "0")}`;
    const confirmationDate = new Date();

    const paymentUpdate = await transaction.pagoReserva.updateMany({
      where: {
        id: paymentId,
        reservaId: reservation.id,
        estado: "PENDIENTE",
      },
      data: {
        estado: "CONFIRMADO",
        confirmadoPorId: auth.usuarioId,
        cajaId: cash.id,
        numeroConstancia: receiptNumber,
        fechaConfirmacion: confirmationDate,
        ...(input.observacion ? { observaciones: input.observacion } : {}),
      },
    });

    if (paymentUpdate.count !== 1) {
      throw new AppError(409, "El pago ya fue procesado anteriormente.", "PAGO_YA_PROCESADO");
    }

    const amount = Number(pendingPayment.monto);
    const cashUpdate: Prisma.CajaUpdateInput = {
      totalAdelantos: { increment: amount },
    };

    switch (pendingPayment.metodoPago) {
      case "EFECTIVO":
        cashUpdate.totalEfectivo = { increment: amount };
        cashUpdate.efectivoEsperado = { increment: amount };
        break;
      case "YAPE":
        cashUpdate.totalYape = { increment: amount };
        break;
      case "PLIN":
        cashUpdate.totalPlin = { increment: amount };
        break;
      case "TARJETA":
        cashUpdate.totalTarjeta = { increment: amount };
        break;
      case "TRANSFERENCIA":
        cashUpdate.totalTransferencia = { increment: amount };
        break;
    }

    await transaction.caja.update({
      where: { id: cash.id },
      data: cashUpdate,
    });

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

export async function getReservationPaymentReceipt(
  auth: ReservationAuth,
  reservationId: string,
  paymentId: string,
) {
  await getReservationForOperation(auth, reservationId);

  const payment = await prisma.pagoReserva.findFirst({
    where: {
      id: paymentId,
      reservaId: reservationId,
      estado: "CONFIRMADO",
    },
    select: {
      id: true,
      metodoPago: true,
      monto: true,
      numeroOperacion: true,
      numeroConstancia: true,
      fechaPago: true,
      fechaConfirmacion: true,
      observaciones: true,
      reserva: {
        select: {
          codigo: true,
          tipoReserva: true,
          fechaReserva: true,
          horaReserva: true,
          cantidadPersonas: true,
          totalEstimado: true,
          adelantoRequerido: true,
          adelantoPagado: true,
          saldoEstimado: true,
          cliente: {
            select: {
              nombres: true,
              apellidos: true,
              correo: true,
              telefono: true,
            },
          },
          sucursal: {
            select: {
              codigo: true,
              nombre: true,
              razonSocial: true,
              ruc: true,
              direccion: true,
              telefono: true,
              correo: true,
            },
          },
          zona: { select: { nombre: true } },
          detalles: {
            where: { cantidadAprobada: { gt: 0 } },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              nombreProducto: true,
              cantidadAprobada: true,
              precioReservado: true,
              subtotal: true,
            },
          },
        },
      },
      caja: { select: { codigo: true } },
      confirmadoPor: {
        select: { nombres: true, apellidos: true },
      },
    },
  });

  if (!payment) {
    throw new AppError(
      404,
      "La constancia de pago no existe o el adelanto aún no fue confirmado.",
      "CONSTANCIA_RESERVA_NO_ENCONTRADA",
    );
  }

  return {
    id: payment.id,
    numeroConstancia: payment.numeroConstancia ?? `LEGACY-${payment.id.slice(0, 8).toUpperCase()}`,
    metodoPago: payment.metodoPago,
    monto: Number(payment.monto),
    numeroOperacion: payment.numeroOperacion,
    fechaPago: payment.fechaPago.toISOString(),
    fechaConfirmacion: payment.fechaConfirmacion?.toISOString() ?? null,
    observaciones: payment.observaciones,
    caja: payment.caja,
    confirmadoPor: payment.confirmadoPor
      ? `${payment.confirmadoPor.nombres} ${payment.confirmadoPor.apellidos}`.trim()
      : null,
    negocio: payment.reserva.sucursal,
    reserva: {
      codigo: payment.reserva.codigo,
      tipoReserva: payment.reserva.tipoReserva,
      fechaReserva: payment.reserva.fechaReserva.toISOString().slice(0, 10),
      horaReserva: payment.reserva.horaReserva.toISOString().slice(11, 16),
      cantidadPersonas: payment.reserva.cantidadPersonas,
      totalEstimado: Number(payment.reserva.totalEstimado),
      adelantoRequerido: Number(payment.reserva.adelantoRequerido),
      adelantoPagado: Number(payment.reserva.adelantoPagado),
      saldoEstimado: Number(payment.reserva.saldoEstimado),
      zona: payment.reserva.zona,
      cliente: {
        ...payment.reserva.cliente,
        nombreCompleto:
          `${payment.reserva.cliente.nombres} ${payment.reserva.cliente.apellidos}`.trim(),
      },
      detalles: payment.reserva.detalles.map((detail) => ({
        ...detail,
        cantidadAprobada: Number(detail.cantidadAprobada),
        precioReservado: Number(detail.precioReservado),
        subtotal: Number(detail.subtotal),
      })),
    },
    aviso:
      "Constancia interna de adelanto de reserva. No reemplaza una boleta de venta ni otro comprobante de pago tributario.",
  };
}
