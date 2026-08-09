import {
    render,
    screen
} from "@testing-library/react";
import {
    describe,
    expect,
    it
} from "vitest";

import OrderCustomerRewards from "../src/pages/admin/orders/OrderCustomerRewards";

const FREE_PRODUCT_REWARD = {
    id: "premio-1",
    descripcion: "Una trucha gratis",
    tipoRecompensa: "PRODUCTO_GRATIS",
    cantidadProducto: 1,
    valorReferencia: null,
    fechaVencimiento:
        "2026-09-01T05:00:00.000Z",
    programa: {
        id: "programa-1",
        nombre: "Cliente frecuente"
    },
    productoPremio: {
        id: "producto-1",
        codigo: "TRUCHA",
        nombre: "Trucha frita"
    }
};

function renderRewards(
    selectedProductIds = new Set()
) {
    return render(
        <div className="admin-layout">
            <OrderCustomerRewards
                customer={{
                    id: "cliente-1",
                    nombreCompleto:
                        "Cliente Prueba"
                }}
                error=""
                isLoading={false}
                rewards={[
                    FREE_PRODUCT_REWARD
                ]}
                selectedProductIds={
                    selectedProductIds
                }
            />
        </div>
    );
}

describe("OrderCustomerRewards", () => {
    it("muestra el premio cuando se selecciona al cliente", () => {
        renderRewards();

        expect(
            screen.getByText(
                "Una trucha gratis"
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Cliente Prueba"
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Añade Trucha frita al pedido para aplicarlo"
            )
        ).toBeInTheDocument();
    });

    it("indica cuando el producto del premio ya forma parte del pedido", () => {
        renderRewards(
            new Set(["producto-1"])
        );

        expect(
            screen.getByText(
                "Disponible para aplicar en caja"
            )
        ).toBeInTheDocument();
    });
});
