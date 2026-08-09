import { describe, expect, it } from "vitest";
import {
    getPendingReservationPaymentAmount,
    getRemainingRequiredAdvance,
    hasOutstandingRequiredAdvance
} from "../src/utils/reservationPayments";

describe("estado de adelantos de reserva", () => {
    it("descuenta pagos confirmados y pendientes del adelanto requerido", () => {
        const reservation = {
            adelantoRequerido: 100,
            adelantoPagado: 40,
            pagos: [
                {
                    estado: "PENDIENTE",
                    monto: 35
                },
                {
                    estado: "RECHAZADO",
                    monto: 50
                }
            ]
        };

        expect(
            getPendingReservationPaymentAmount(
                reservation.pagos
            )
        ).toBe(35);
        expect(
            getRemainingRequiredAdvance(
                reservation
            )
        ).toBe(25);
        expect(
            hasOutstandingRequiredAdvance(
                reservation
            )
        ).toBe(true);
    });

    it("oculta nuevos pagos cuando el adelanto ya está cubierto", () => {
        const reservation = {
            adelantoRequerido: 50,
            adelantoPagado: 50,
            pagos: []
        };

        expect(
            getRemainingRequiredAdvance(
                reservation
            )
        ).toBe(0);
        expect(
            hasOutstandingRequiredAdvance(
                reservation
            )
        ).toBe(false);
    });
});
