import {
    render,
    screen,
    within
} from "@testing-library/react";
import {
    describe,
    expect,
    it
} from "vitest";

import OrderChargeSummary from "../src/pages/admin/sales/OrderChargeSummary";

describe("OrderChargeSummary", () => {
    it("muestra los productos, cantidades e importes antes del cobro", () => {
        render(
            <OrderChargeSummary
                order={{
                    id: "pedido-1",
                    subtotal: 35,
                    detalles: [
                        {
                            id: "detalle-1",
                            nombreProducto: "Pachamanca personal",
                            cantidad: 2,
                            precioUnitario: 12.5,
                            subtotal: 25
                        },
                        {
                            id: "detalle-2",
                            nombreProducto: "Chicha morada",
                            cantidad: 1,
                            precioUnitario: 10,
                            subtotal: 10
                        }
                    ]
                }}
            />
        );

        expect(
            screen.getByText("2 productos")
        ).toBeInTheDocument();

        const pachamancaRow =
            screen
                .getByText("Pachamanca personal")
                .closest("tr");

        expect(
            within(pachamancaRow)
                .getByText("2")
        ).toBeInTheDocument();

        expect(
            pachamancaRow
        ).toHaveTextContent("12.50");
        expect(
            pachamancaRow
        ).toHaveTextContent("25.00");

        expect(
            screen.getByText(
                "Subtotal del pedido"
            ).closest("tr")
        ).toHaveTextContent("35.00");
    });

    it("informa si un pedido no contiene productos cobrables", () => {
        render(
            <OrderChargeSummary
                order={{
                    subtotal: 0,
                    detalles: []
                }}
            />
        );

        expect(
            screen.getByText(
                "Este pedido no contiene productos para cobrar."
            )
        ).toBeInTheDocument();
    });
});
