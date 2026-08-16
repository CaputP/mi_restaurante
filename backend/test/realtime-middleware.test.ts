import {
  describe,
  expect,
  it,
} from "vitest";

import {
  appendRealtimeResources,
  getRealtimeResources,
} from "../src/middlewares/realtime.middleware.js";

import type {
  Response,
} from "express";

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

  it("propaga una venta a módulos operativos sin invalidar fidelización global", () => {
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
      ]),
    );

    expect(
      getRealtimeResources(
        "/api/v1/sales/venta-1/void",
      ),
    ).not.toContain(
      "LOYALTY",
    );
  });

  it("actualiza los catálogos cliente cuando cambia catálogo o sucursal", () => {
    expect(
      getRealtimeResources(
        "/api/v1/catalog/products/producto-1",
      ),
    ).toEqual(
      expect.arrayContaining([
        "LOYALTY",
        "PROMOTIONS",
      ]),
    );

    expect(
      getRealtimeResources(
        "/api/v1/branches/sucursal-1",
      ),
    ).toEqual(
      expect.arrayContaining([
        "LOYALTY",
        "PROMOTIONS",
      ]),
    );
  });

  it("agrega recursos condicionales sin duplicarlos", () => {
    const response = {
      locals:
        {},
    } as Response;

    appendRealtimeResources(
      response,
      "PROMOTIONS",
      "PROMOTIONS",
    );

    expect(
      response.locals
        .realtimeResources,
    ).toEqual([
      "PROMOTIONS",
    ]);
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
