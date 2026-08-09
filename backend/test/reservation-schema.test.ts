import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createClientReservationSchema,
} from "../src/modules/reservations/reservation.schema.js";

const validReservation = {
  sucursalId:
    "11111111-1111-4111-8111-111111111111",
  zonaId:
    "22222222-2222-4222-8222-222222222222",
  fechaReserva: "2030-08-08",
  horaReserva: "12:30",
  aceptaPoliticaReserva: true,
  versionPoliticaReserva:
    "1.0-2026-08-08",
  duracionMinutos: 120,
  cantidadPersonas: 8,
  tipoReserva: "EVENTO" as const,
  nombreEvento: "Cumpleaños",
};

describe("esquema de reservas del cliente", () => {
  it("se puede importar y aplica los valores seguros por defecto", () => {
    const result =
      createClientReservationSchema.parse(
        validReservation,
      );

    expect(result.detalles).toEqual([]);
    expect(result).not.toHaveProperty(
      "clienteId",
    );
    expect(result).not.toHaveProperty(
      "adelantoRequerido",
    );
  });

  it("exige un nombre para las reservas de eventos", () => {
    const result =
      createClientReservationSchema.safeParse({
        ...validReservation,
        nombreEvento: "",
      });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          ({ path }) =>
            path.includes(
              "nombreEvento",
            ),
        ),
      ).toBe(true);
    }
  });

  it("rechaza productos repetidos dentro de la misma reserva", () => {
    const productId =
      "33333333-3333-4333-8333-333333333333";
    const result =
      createClientReservationSchema.safeParse({
        ...validReservation,
        detalles: [
          {
            productoSucursalId:
              productId,
            cantidadSolicitada: 1,
          },
          {
            productoSucursalId:
              productId,
            cantidadSolicitada: 2,
          },
        ],
      });

    expect(result.success).toBe(false);
  });
});
