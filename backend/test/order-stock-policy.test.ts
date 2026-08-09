import { describe, expect, it } from "vitest";
import {
  calculateAvailableStock,
  hasSufficientStock,
} from "../src/shared/orders/order-stock-policy.js";

describe("política de stock de pedidos", () => {
  it("resta las cantidades comprometidas por otros procesos", () => {
    expect(calculateAvailableStock(10, 4)).toBe(6);
    expect(hasSufficientStock(7, 6)).toBe(false);
  });

  it("reconoce como disponible el compromiso propio de una reserva", () => {
    expect(calculateAvailableStock(10, 8, 3)).toBe(5);
    expect(hasSufficientStock(5, 5)).toBe(true);
  });

  it("tolera únicamente diferencias decimales de redondeo", () => {
    expect(hasSufficientStock(1.0004, 1)).toBe(true);
    expect(hasSufficientStock(1.001, 1)).toBe(false);
  });
});
