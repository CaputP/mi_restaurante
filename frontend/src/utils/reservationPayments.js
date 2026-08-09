export const RESERVATION_PAYMENT_EPSILON = 0.009;

export function getPendingReservationPaymentAmount(
    payments = []
) {
    return payments
        .filter(
            (payment) =>
                payment.estado ===
                "PENDIENTE"
        )
        .reduce(
            (total, payment) =>
                total +
                Number(payment.monto ?? 0),
            0
        );
}

export function getRemainingRequiredAdvance(
    reservation
) {
    const pendingAmount =
        getPendingReservationPaymentAmount(
            reservation.pagos
        );

    return Math.max(
        0,
        Number(
            reservation.adelantoRequerido ??
                0
        ) -
            Number(
                reservation.adelantoPagado ??
                    0
            ) -
            pendingAmount
    );
}

export function hasOutstandingRequiredAdvance(
    reservation
) {
    return (
        getRemainingRequiredAdvance(
            reservation
        ) > RESERVATION_PAYMENT_EPSILON
    );
}
