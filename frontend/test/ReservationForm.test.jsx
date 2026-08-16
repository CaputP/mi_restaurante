import {
    fireEvent,
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

import ReservationForm from "../src/pages/reservations/ReservationForm";

const BRANCH_ID =
    "11111111-1111-4111-8111-111111111111";
const ZONE_ID =
    "22222222-2222-4222-8222-222222222222";

const OPTIONS = {
    sucursalSeleccionadaId:
        BRANCH_ID,
    sucursales: [
        {
            id: BRANCH_ID,
            nombre: "Sede Chocco"
        }
    ],
    zonas: [
        {
            id: ZONE_ID,
            nombre: "Salón",
            capacidadReferencial: 20
        }
    ],
    productos: [],
    tiposReserva: [
        {
            codigo: "NORMAL",
            nombre: "Reserva normal"
        }
    ],
    duraciones: [120]
};

function completeRequiredFields() {
    fireEvent.change(
        screen.getByLabelText("Zona"),
        {
            target: {
                value: ZONE_ID
            }
        }
    );

    fireEvent.click(
        screen.getByRole("checkbox", {
            name: /He leído y acepto/
        })
    );

    fireEvent.change(
        screen.getByLabelText("Fecha"),
        {
            target: {
                value: "2030-08-08"
            }
        }
    );
}

function renderForm(onSubmit) {
    return render(
        <ReservationForm
            options={OPTIONS}
            isSubmitting={false}
            onBranchChange={vi.fn()}
            onCancel={vi.fn()}
            onSubmit={onSubmit}
        />
    );
}

describe("ReservationForm", () => {
    it("envía una solicitud válida al pulsar Solicitar reserva", async () => {
        const user =
            userEvent.setup();
        const onSubmit =
            vi.fn()
                .mockResolvedValue({
                    success: true
                });

        renderForm(onSubmit);
        completeRequiredFields();

        await user.click(
            screen.getByRole(
                "button",
                {
                    name: "Solicitar reserva"
                }
            )
        );

        await waitFor(() => {
            expect(onSubmit)
                .toHaveBeenCalledWith({
                    sucursalId:
                        BRANCH_ID,
                    zonaId:
                        ZONE_ID,
                    fechaReserva:
                        "2030-08-08",
                    horaReserva:
                        "12:00",
                    duracionMinutos: 120,
                    cantidadPersonas: 2,
                    tipoReserva: "NORMAL",
                    nombreEvento: null,
                    observaciones: null,
                    aceptaPoliticaReserva: true,
                    versionPoliticaReserva:
                        "1.1-2026-08-15",
                    detalles: []
                });
        });
    });

    it("muestra junto al formulario el error devuelto por el servidor", async () => {
        const user =
            userEvent.setup();
        const onSubmit =
            vi.fn()
                .mockResolvedValue({
                    success: false,
                    error:
                        "El horario ya no está disponible."
                });

        renderForm(onSubmit);
        completeRequiredFields();

        await user.click(
            screen.getByRole(
                "button",
                {
                    name: "Solicitar reserva"
                }
            )
        );

        expect(
            await screen.findByRole(
                "alert"
            )
        ).toHaveTextContent(
            "El horario ya no está disponible."
        );
    });

    it("detiene fechas pasadas antes de llamar al backend", async () => {
        const onSubmit =
            vi.fn();

        renderForm(onSubmit);

        fireEvent.change(
            screen.getByLabelText("Zona"),
            {
                target: {
                    value: ZONE_ID
                }
            }
        );

        fireEvent.change(
            screen.getByLabelText("Fecha"),
            {
                target: {
                    value: "2020-01-01"
                }
            }
        );

        fireEvent.submit(
            screen.getByRole(
                "button",
                {
                    name: "Solicitar reserva"
                }
            ).closest("form")
        );

        expect(onSubmit)
            .not.toHaveBeenCalled();
        expect(
            screen.getByRole("alert")
        ).toHaveTextContent(
            "Selecciona una fecha y hora futuras."
        );
    });
});
