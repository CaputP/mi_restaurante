import {
  describe,
  expect,
  it,
} from "vitest";

import {
  getRealtimeResources,
} from "../src/middlewares/realtime.middleware.js";

describe("enrutamiento de eventos en tiempo real", () => {
  it("propaga un cambio de reserva a sus módulos dependientes", () => {
    expect(
      getRealtimeResources(
        "/api/v1/admin/reservations/reserva-1/approve",
      ),
    ).toEqual(
      expect.arrayContaining([
        "RESERVATIONS",
        "ORDERS",
        "INVENTORY",
        "REPORTS",
        "NOTIFICATIONS",
      ]),
    );
  });

  it("propaga una venta hacia caja, stock, reportes y fidelización", () => {
    expect(
      getRealtimeResources(
        "/api/v1/sales/venta-1/void",
      ),
    ).toEqual(
      expect.arrayContaining([
        "SALES",
        "CASH",
        "INVENTORY",
        "REPORTS",
        "LOYALTY",
      ]),
    );
  });

  it("reconoce rutas sin versión y omite autenticación", () => {
    expect(
      getRealtimeResources(
        "/api/cash/caja-1/close",
      ),
    ).toContain("CASH");

    expect(
      getRealtimeResources(
        "/api/v1/auth/login",
      ),
    ).toEqual([]);
  });
});
