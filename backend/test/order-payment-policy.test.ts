import {
  describe,
  expect,
  it,
} from "vitest";

import {
  isOrderPayable,
  PAYABLE_ORDER_STATES,
} from "../src/shared/orders/order-payment-policy.js";

describe("order payment policy", () => {
  it.each(PAYABLE_ORDER_STATES)(
    "permite cobrar un pedido en estado %s",
    (status) => {
      expect(
        isOrderPayable(status),
      ).toBe(true);
    },
  );

  it.each([
    "ABIERTO",
    "PAGADO",
    "CANCELADO",
  ])(
    "rechaza cobrar un pedido en estado %s",
    (status) => {
      expect(
        isOrderPayable(status),
      ).toBe(false);
    },
  );
});
