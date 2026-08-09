import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  Prisma,
} from "../src/generated/prisma/client.js";

import {
  createReservationPaymentPendingNotifications,
} from "../src/modules/notifications/reservation-notification.service.js";

describe("notificación de pago de reserva", () => {
  it("alerta a los administradores de la sucursal", async () => {
    const createMany =
      vi.fn()
        .mockResolvedValue({
          count: 1,
        });

    const transaction = {
      usuarioSucursal: {
        findMany:
          vi.fn()
            .mockResolvedValue([
              {
                usuario: {
                  id: "admin-sucursal-1",
                  rolId: "rol-admin-1",
                },
              },
            ]),
      },
      usuario: {
        findMany:
          vi.fn()
            .mockResolvedValue([]),
      },
      notificacion: {
        findMany:
          vi.fn()
            .mockResolvedValue([]),
        createMany,
      },
    } as unknown as Prisma.TransactionClient;

    const result =
      await createReservationPaymentPendingNotifications(
        transaction,
        {
          reservationId:
            "reserva-1",
          reservationCode:
            "RES-0001",
          branchId:
            "sucursal-1",
          paymentMethod:
            "YAPE",
          amount:
            50,
        },
      );

    expect(result).toEqual({
      creadas: 1,
    });

    expect(createMany)
      .toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            usuarioId:
              "admin-sucursal-1",
            tipo:
              "RESERVA_PENDIENTE",
            titulo:
              "Pago por validar · RES-0001",
            entidad:
              "Reserva",
            entidadId:
              "reserva-1",
            leida:
              false,
          }),
        ],
      });
  });
});
