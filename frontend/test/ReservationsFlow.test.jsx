import {
    fireEvent,
    render,
    screen,
    waitFor
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi
} from "vitest";

import Reservations from "../src/pages/reservations/reservations";

const {
    availabilityRequestMock,
    createRequestMock,
    listRequestMock,
    optionsRequestMock
} = vi.hoisted(
    () => ({
        availabilityRequestMock:
            vi.fn(),
        createRequestMock:
            vi.fn(),
        listRequestMock:
            vi.fn(),
        optionsRequestMock:
            vi.fn()
    })
);

vi.mock(
    "../src/context/AuthContext",
    () => ({
        useAuth: () => ({
            token: "token-cliente",
            usuario: {
                nombres: "Ana"
            }
        })
    })
);

vi.mock(
    "../src/components/sessionHeader/SessionHeader",
    () => ({
        default: () => null
    })
);

vi.mock(
    "../src/components/clientNav/ClientNav",
    () => ({
        default: () => null
    })
);

vi.mock(
    "../src/services/reservation.service",
    () => ({
        cancelClientReservationRequest:
            vi.fn(),
        checkClientReservationAvailabilityRequest:
            availabilityRequestMock,
        createClientReservationRequest:
            createRequestMock,
        getClientReservationOptionsRequest:
            optionsRequestMock,
        getClientReservationRequest:
            vi.fn(),
        listClientReservationsRequest:
            listRequestMock,
        registerClientReservationPaymentRequest:
            vi.fn(),
        rescheduleClientReservationRequest:
            vi.fn()
    })
);

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
    horarios: [],
    tiposReserva: [
        {
            codigo: "NORMAL",
            nombre: "Reserva normal"
        }
    ],
    duraciones: [120]
};

describe("flujo de reservas del cliente", () => {
    beforeEach(() => {
        optionsRequestMock
            .mockResolvedValue(OPTIONS);
        listRequestMock
            .mockResolvedValue({
                reservas: [],
                pagination: {
                    page: 1,
                    total: 0,
                    totalPages: 1
                }
            });
        availabilityRequestMock
            .mockResolvedValue({
                disponible: true,
                motivos: []
            });
        createRequestMock
            .mockResolvedValue({
                success: true
            });
    });

    it("verifica disponibilidad y registra la solicitud", async () => {
        const user =
            userEvent.setup();

        render(
            <Reservations />
        );

        await user.click(
            await screen.findByRole(
                "button",
                {
                    name: "Nueva reserva"
                }
            )
        );

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
                    value: "2030-08-08"
                }
            }
        );

        await user.click(
            screen.getByRole("checkbox", {
                name: /He leído y acepto/
            })
        );

        await user.click(
            screen.getByRole(
                "button",
                {
                    name: "Solicitar reserva"
                }
            )
        );

        await waitFor(() => {
            expect(
                availabilityRequestMock
            ).toHaveBeenCalledTimes(1);
            expect(
                createRequestMock
            ).toHaveBeenCalledTimes(1);
        });

        expect(
            createRequestMock
        ).toHaveBeenCalledWith(
            "token-cliente",
            expect.objectContaining({
                sucursalId:
                    BRANCH_ID,
                zonaId:
                    ZONE_ID,
                fechaReserva:
                    "2030-08-08",
                tipoReserva:
                    "NORMAL"
            })
        );

        expect(
            await screen.findByRole(
                "status"
            )
        ).toHaveTextContent(
            "Tu solicitud fue registrada"
        );

        expect(
            screen.queryByRole(
                "button",
                {
                    name: "Solicitar reserva"
                }
            )
        ).not.toBeInTheDocument();
    });
});
