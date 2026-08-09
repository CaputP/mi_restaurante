import {
    StrictMode
} from "react";
import {
    render,
    screen,
    waitFor
} from "@testing-library/react";
import {
    MemoryRouter,
    Route,
    Routes
} from "react-router-dom";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi
} from "vitest";

import SaleTicketPage from "../src/pages/admin/sales/SaleTicketPage";

const {
    getSaleTicketRequestMock
} = vi.hoisted(
    () => ({
        getSaleTicketRequestMock:
            vi.fn()
    })
);

vi.mock(
    "../src/context/AuthContext",
    () => ({
        useAuth: () => ({
            token: "token-prueba",
            usuario: {
                rol: {
                    codigo: "VENDEDOR"
                }
            }
        })
    })
);

vi.mock(
    "../src/services/ticket.service",
    () => ({
        getSaleTicketRequest:
            getSaleTicketRequestMock
    })
);

const TICKET = {
    numeroTicket: "V-000001",
    estado: "REGISTRADA",
    fechaEmision: "2026-08-08T15:00:00.000Z",
    negocio: {
        nombre: "El Vallecito de Chocco",
        razonSocial: null,
        ruc: null,
        direccion: "Ayacucho",
        telefono: null
    },
    pedido: {
        codigo: "PED-0001",
        tipo: "MESA",
        zona: "Salón"
    },
    caja: {
        codigo: "CAJA-01"
    },
    vendedor: {
        nombreCompleto: "Vendedor de prueba"
    },
    cliente: {
        nombreCompleto: "Público general"
    },
    detalles: [
        {
            id: "detalle-1",
            nombreProducto: "Pachamanca",
            cantidad: 1,
            precioUnitario: 30,
            subtotal: 30
        }
    ],
    promociones: [],
    premiosCanjeados: [],
    resumen: {
        subtotal: 30,
        descuentoPromocional: 0,
        descuentoPremios: 0,
        descuentoManual: 0,
        descuento: 0,
        propina: 0,
        total: 30,
        adelantoAplicado: 0,
        saldoCobrar: 30
    },
    pagos: [],
    observaciones: null,
    anulacion: null
};

describe("SaleTicketPage", () => {
    beforeEach(() => {
        getSaleTicketRequestMock
            .mockResolvedValue(TICKET);
    });

    it("imprime una sola vez el comprobante recién registrado", async () => {
        const printSpy =
            vi.spyOn(
                window,
                "print"
            ).mockImplementation(
                () => {}
            );

        render(
            <StrictMode>
                <MemoryRouter
                    initialEntries={[
                        {
                            pathname: "/operacion/ventas/ticket/venta-1",
                            state: {
                                autoPrint: true,
                                fromSaleCreation: true,
                                printRequestId: "impresion-prueba-1"
                            }
                        }
                    ]}
                >
                    <Routes>
                        <Route
                            path="/operacion/ventas/ticket/:saleId"
                            element={
                                <SaleTicketPage />
                            }
                        />
                    </Routes>
                </MemoryRouter>
            </StrictMode>
        );

        expect(
            await screen.findByText(
                "TICKET DE VENTA"
            )
        ).toBeInTheDocument();

        await waitFor(() => {
            expect(
                printSpy
            ).toHaveBeenCalledTimes(1);
        });

        expect(
            screen.getByRole(
                "checkbox"
            )
        ).not.toBeChecked();
    });
});
