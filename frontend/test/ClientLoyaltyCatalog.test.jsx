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

import ClientLoyalty from "../src/pages/client/loyalty/ClientLoyalty";
import ClientLoyaltyLayout from "../src/pages/client/loyalty/ClientLoyaltyLayout";
import ClientLoyaltyPrograms from "../src/pages/client/loyalty/ClientLoyaltyPrograms";
import ClientPromotions from "../src/pages/client/loyalty/ClientPromotions";

const {
    programsRequestMock,
    promotionsRequestMock
} = vi.hoisted(
    () => ({
        programsRequestMock: vi.fn(),
        promotionsRequestMock: vi.fn()
    })
);

vi.mock(
    "../src/context/AuthContext",
    () => ({
        useAuth: () => ({
            token: "token-cliente",
            usuario: {
                nombres: "Ana",
                rol: {
                    codigo: "CLIENTE",
                    nombre: "Cliente"
                },
                permisos: [
                    {
                        codigo: "RESERVA_CREAR"
                    },
                    {
                        codigo: "CLIENTE_PREMIOS_VER"
                    },
                    {
                        codigo: "CLIENTE_HISTORIAL_VER"
                    }
                ]
            }
        })
    })
);

vi.mock(
    "../src/context/RealtimeContext",
    () => ({
        useRealtimeVersion: () => 0
    })
);

vi.mock(
    "../src/components/sessionHeader/SessionHeader",
    () => ({
        default: () => null
    })
);

vi.mock(
    "../src/services/loyalty.service",
    () => ({
        getMyLoyaltyProfileRequest: vi.fn(),
        listAvailableLoyaltyProgramsRequest:
            programsRequestMock
    })
);

vi.mock(
    "../src/services/promotions.service",
    () => ({
        listAvailablePromotionsRequest:
            promotionsRequestMock
    })
);

function renderModule(path) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route
                    path="/fidelizacion"
                    element={<ClientLoyaltyLayout />}
                >
                    <Route
                        index
                        element={<ClientLoyalty />}
                    />
                    <Route
                        path="programas"
                        element={<ClientLoyaltyPrograms />}
                    />
                    <Route
                        path="promociones"
                        element={<ClientPromotions />}
                    />
                </Route>
            </Routes>
        </MemoryRouter>
    );
}

const PROGRAM_WITHOUT_PROGRESS = {
    id: "programa-1",
    nombre: "Cliente frecuente",
    descripcion:
        "Acumula visitas y recibe un premio.",
    tipo: "VISITAS",
    visitasRequeridas: 5,
    montoRequerido: null,
    tipoRecompensa: "PRODUCTO_GRATIS",
    productoPremio: {
        id: "producto-1",
        nombre: "Trucha frita"
    },
    cantidadPremio: 1,
    montoDescuento: null,
    porcentajeDescuento: null,
    descripcionBeneficio: null,
    vigenciaDiasPremio: 30,
    fechaInicio: "2026-08-01T00:00:00.000Z",
    fechaFin: null,
    sucursal: null,
    progreso: {
        iniciado: false,
        visitasAcumuladas: 0,
        montoAcumulado: 0,
        visitasCicloActual: 0,
        montoCicloActual: 0,
        ciclosCompletados: 0,
        porcentaje: 0,
        porcentajeVisitas: 0,
        porcentajeMonto: null,
        updatedAt: null
    }
};

describe("catálogo de beneficios del cliente", () => {
    beforeEach(() => {
        programsRequestMock.mockReset();
        promotionsRequestMock.mockReset();

        programsRequestMock.mockResolvedValue({
            programas: [
                PROGRAM_WITHOUT_PROGRESS
            ],
            total: 1
        });
        promotionsRequestMock.mockResolvedValue({
            promociones: [],
            total: 0
        });
    });

    it("mantiene una sola entrada principal y una pestaña interna activa", async () => {
        renderModule(
            "/fidelizacion/programas"
        );

        expect(
            await screen.findByText(
                "Cliente frecuente"
            )
        ).toBeInTheDocument();

        const mainActiveLinks =
            document.querySelectorAll(
                ".client-nav-link.active"
            );
        const internalActiveLinks =
            document.querySelectorAll(
                ".client-loyalty-tab.active"
            );

        expect(mainActiveLinks).toHaveLength(1);
        expect(
            mainActiveLinks[0]
        ).toHaveTextContent("Mi fidelización");
        expect(internalActiveLinks).toHaveLength(1);
        expect(
            internalActiveLinks[0]
        ).toHaveTextContent("Programas vigentes");
    });

    it("muestra los programas aunque el cliente todavía no tenga progreso", async () => {
        renderModule(
            "/fidelizacion/programas"
        );

        expect(
            await screen.findByText(
                "Cliente frecuente"
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Aún no iniciado"
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "5 visitas"
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Trucha frita gratis"
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "30 día(s) desde que lo obtienes"
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                /Identifícate como cliente/
            )
        ).toBeInTheDocument();

        expect(
            programsRequestMock
        ).toHaveBeenCalledWith(
            "token-cliente",
            expect.any(AbortSignal)
        );
    });

    it("presenta los tipos y condiciones de las promociones automáticas", async () => {
        promotionsRequestMock.mockResolvedValue({
            promociones: [
                {
                    id: "promo-1",
                    nombre: "Descuento de temporada",
                    descripcion: "Para toda la familia.",
                    tipo: "DESCUENTO_PORCENTAJE",
                    valor: 15,
                    consumoMinimo: 50,
                    acumulable: false,
                    fechaInicio:
                        "2026-08-01T15:00:00.000Z",
                    fechaFin:
                        "2026-08-31T23:00:00.000Z",
                    sucursal: null,
                    productos: [],
                    aplicacionAutomatica: true,
                    sujetaACupo: true
                },
                {
                    id: "promo-2",
                    nombre: "Ahorro directo",
                    tipo: "DESCUENTO_FIJO",
                    valor: 8,
                    consumoMinimo: 0,
                    acumulable: true,
                    fechaInicio:
                        "2026-08-01T15:00:00.000Z",
                    fechaFin:
                        "2026-08-31T23:00:00.000Z",
                    sucursal: {
                        id: "sucursal-1",
                        nombre: "Sede Chocco"
                    },
                    productos: [
                        {
                            id: "producto-1",
                            nombre: "Trucha"
                        }
                    ],
                    aplicacionAutomatica: true
                },
                {
                    id: "promo-3",
                    nombre: "Invitación de la casa",
                    tipo: "PRODUCTO_GRATIS",
                    valor: 2,
                    consumoMinimo: 0,
                    acumulable: false,
                    fechaInicio:
                        "2026-08-01T15:00:00.000Z",
                    fechaFin:
                        "2026-08-31T23:00:00.000Z",
                    sucursal: null,
                    productos: [
                        {
                            id: "producto-2",
                            nombre: "Chicha"
                        }
                    ],
                    aplicacionAutomatica: true
                },
                {
                    id: "promo-4",
                    nombre: "Combo familiar",
                    tipo: "COMBO",
                    valor: 35,
                    consumoMinimo: 0,
                    acumulable: false,
                    fechaInicio:
                        "2026-08-01T15:00:00.000Z",
                    fechaFin:
                        "2026-08-31T23:00:00.000Z",
                    sucursal: null,
                    productos: [
                        {
                            id: "producto-3",
                            nombre: "Cuy"
                        }
                    ],
                    aplicacionAutomatica: true
                }
            ],
            total: 4
        });

        renderModule(
            "/fidelizacion/promociones"
        );

        expect(
            await screen.findByText(
                "15% de descuento"
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                /S\/\s*8[,.]00 de descuento/
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "2 producto(s) gratis"
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                /Combo por S\/\s*35[,.]00/
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                /S\/\s*50[,.]00/
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Aplica a toda la carta"
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText("Sede Chocco")
        ).toBeInTheDocument();
        expect(
            screen.getAllByText(
                "Aplicación automática en caja"
            )
        ).toHaveLength(4);
        expect(
            screen.getAllByText(
                /No necesitas ingresar ningún código/
            )
        ).toHaveLength(4);
        expect(
            screen.getByText(
                "Acumulable con otras promociones compatibles"
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Válida hasta agotar cupo"
            )
        ).toBeInTheDocument();
        expect(
            screen.getAllByText(
                /hora Perú/
            )
        ).toHaveLength(4);

        await waitFor(() => {
            expect(
                promotionsRequestMock
            ).toHaveBeenCalledTimes(1);
        });
    });
});
