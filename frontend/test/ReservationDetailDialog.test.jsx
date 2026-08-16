import {
    render,
    screen,
    waitFor
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    describe,
    expect,
    it,
    vi
} from "vitest";

import ReservationDetailDialog from "../src/pages/reservations/ReservationDetailDialog";

const BASE_RESERVATION = {
    id: "reserva-1",
    codigo: "RES-0001",
    estado: "ESPERANDO_ADELANTO",
    createdAt: "2026-08-08T15:00:00.000Z",
    fechaReserva: "2026-08-20",
    horaReserva: "13:00",
    duracionMinutos: 120,
    cantidadPersonas: 4,
    tipoReserva: "MESA",
    nombreEvento: null,
    sucursal: {
        id: "sucursal-1",
        nombre: "Sede Chocco"
    },
    zona: {
        id: "zona-1",
        nombre: "Salón"
    },
    totalEstimado: 100,
    adelantoRequerido: 50,
    adelantoPagado: 0,
    saldoEstimado: 100,
    observaciones: null,
    detalles: [],
    pagos: [],
    historial: []
};

function renderDialog(
    overrides = {},
    props = {}
) {
    return render(
        <div className="client-reservations-shell">
            <ReservationDetailDialog
                error=""
                reservation={{
                    ...BASE_RESERVATION,
                    ...overrides
                }}
                isBusy={false}
                onCancelReservation={
                    vi.fn()
                }
                onClose={vi.fn()}
                onPay={vi.fn()}
                onReschedule={vi.fn()}
                success=""
                {...props}
            />
        </div>
    );
}

describe("ReservationDetailDialog", () => {
    it("abre el formulario y envía el pago para validación administrativa", async () => {
        const user =
            userEvent.setup();
        const onPay =
            vi.fn()
                .mockResolvedValue(true);

        renderDialog(
            {},
            {
                onPay
            }
        );

        await user.click(
            screen.getByRole(
                "button",
                {
                    name: "Agregar pago"
                }
            )
        );

        expect(
            screen.getByRole(
                "heading",
                {
                    name: "Informar pago realizado"
                }
            )
        ).toBeInTheDocument();

        await user.type(
            screen.getByLabelText(
                "Número de operación"
            ),
            "YP-123456"
        );

        await user.click(
            screen.getByRole(
                "button",
                {
                    name: "Enviar para validación"
                }
            )
        );

        await waitFor(() => {
            expect(onPay)
                .toHaveBeenCalledWith({
                    metodoPago: "YAPE",
                    monto: 50,
                    numeroOperacion:
                        "YP-123456",
                    observaciones: null
                });
        });

        expect(
            screen.queryByRole(
                "heading",
                {
                    name: "Informar pago realizado"
                }
            )
        ).not.toBeInTheDocument();

    });

    it("descuenta pagos pendientes y evita informar más que el saldo", () => {
        renderDialog({
            pagos: [
                {
                    id: "pago-1",
                    metodoPago: "YAPE",
                    monto: 100,
                    numeroOperacion:
                        "YP-0001",
                    estado: "PENDIENTE",
                    fechaPago:
                        "2026-08-08T16:00:00.000Z"
                }
            ]
        });

        expect(
            screen.getByText(
                "Pendiente de validación"
            )
        ).toBeInTheDocument();

        expect(
            screen.queryByRole(
                "button",
                {
                    name: "Agregar pago"
                }
            )
        ).not.toBeInTheDocument();
    });

    it("muestra solo el detalle cuando el adelanto requerido ya fue cubierto", () => {
        renderDialog({
            estado: "CONFIRMADA",
            adelantoPagado: 50,
            saldoEstimado: 50,
            pagos: [
                {
                    id: "pago-confirmado",
                    metodoPago: "YAPE",
                    monto: 50,
                    numeroOperacion:
                        "YP-0050",
                    estado: "CONFIRMADO",
                    fechaPago:
                        "2026-08-08T16:00:00.000Z"
                }
            ]
        });

        expect(
            screen.getByRole(
                "heading",
                {
                    name: "Detalle de la reserva"
                }
            )
        ).toBeInTheDocument();

        expect(
            screen.queryByRole(
                "button",
                {
                    name: "Agregar pago"
                }
            )
        ).not.toBeInTheDocument();

        expect(
            screen.queryByRole(
                "heading",
                {
                    name: "Informar pago realizado"
                }
            )
        ).not.toBeInTheDocument();

        expect(
            screen.getByRole(
                "link",
                {
                    name: "Constancia"
                }
            )
        ).toHaveAttribute(
            "href",
            "/reservations/reserva-1/payments/pago-confirmado/receipt"
        );
    });

    it("muestra la confirmación dentro de la ventana", () => {
        renderDialog(
            {},
            {
                success:
                    "Pago informado. Queda pendiente de confirmación."
            }
        );

        expect(
            screen.getByRole("status")
        ).toHaveTextContent(
            "Pago informado"
        );
    });
});
