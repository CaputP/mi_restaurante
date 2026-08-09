import { describe, expect, it } from "vitest";
import {
  calculateRemainingRequiredAdvance,
  hasOutstandingRequiredAdvance,
} from "../src/shared/reservations/reservation-payment-policy.js";

describe("política de adelantos de reserva", () => {
  it("calcula solo el adelanto requerido que falta cubrir", () => {
    expect(calculateRemainingRequiredAdvance(50, 20)).toBe(30);
    expect(hasOutstandingRequiredAdvance(30)).toBe(true);
  });

  it("considera cubierto el adelanto confirmado o pendiente", () => {
    expect(calculateRemainingRequiredAdvance(50, 50)).toBe(0);
    expect(calculateRemainingRequiredAdvance(50, 70)).toBe(0);
    expect(hasOutstandingRequiredAdvance(0)).toBe(false);
  });

  it("tolera diferencias decimales menores a un milésimo", () => {
    expect(hasOutstandingRequiredAdvance(0.0009)).toBe(false);
    expect(hasOutstandingRequiredAdvance(0.01)).toBe(true);
  });
});
