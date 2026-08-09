import {
  describe,
  expect,
  it,
} from "vitest";

import {
  reportDetailsQuerySchema,
} from "../src/modules/reports/report.schema.js";

describe("esquema del detalle de reportes", () => {
  it("normaliza la paginación y acepta un desglose de adelantos", () => {
    const result =
      reportDetailsQuerySchema.parse({
        tipo: "ADELANTOS_RESERVA",
        filtro: "YAPE",
        page: "2",
        limit: "20",
        fechaDesde: "2026-08-01",
        fechaHasta: "2026-08-08",
      });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(20);
    expect(result.filtro).toBe("YAPE");
  });

  it("rechaza un estado incompatible con el tipo solicitado", () => {
    const result =
      reportDetailsQuerySchema.safeParse({
        tipo: "CAJAS",
        filtro: "PAGADO",
      });

    expect(result.success).toBe(false);
  });

  it("rechaza identificadores de producto inválidos", () => {
    const result =
      reportDetailsQuerySchema.safeParse({
        tipo: "PRODUCTOS",
        filtro: "producto-invalido",
      });

    expect(result.success).toBe(false);
  });

  it("conserva el límite máximo de un año del reporte principal", () => {
    const result =
      reportDetailsQuerySchema.safeParse({
        tipo: "VENTAS",
        fechaDesde: "2024-01-01",
        fechaHasta: "2026-01-01",
      });

    expect(result.success).toBe(false);
  });
});
