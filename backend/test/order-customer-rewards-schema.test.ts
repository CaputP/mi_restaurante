import { describe, expect, it } from "vitest";
import { orderCustomerRewardsQuerySchema } from "../src/modules/orders/order.schema.js";

describe("consulta de premios durante un pedido", () => {
  it("exige una sucursal y un cliente válidos", () => {
    const result = orderCustomerRewardsQuerySchema.safeParse({
      sucursalId: "10000000-0000-4000-8000-000000000001",
      clienteId: "10000000-0000-4000-8000-000000000002",
    });

    expect(result.success).toBe(true);
  });

  it("rechaza identificadores manipulados", () => {
    const result = orderCustomerRewardsQuerySchema.safeParse({
      sucursalId: "sucursal-ajena",
      clienteId: "cliente-invalido",
    });

    expect(result.success).toBe(false);
  });
});
