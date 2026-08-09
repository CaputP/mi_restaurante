import {
    render,
    screen
} from "@testing-library/react";
import {
    MemoryRouter
} from "react-router-dom";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi
} from "vitest";

import Navbar from "../src/components/navbar/navbar";
import SessionHeader from "../src/components/sessionHeader/SessionHeader";

const authState = vi.hoisted(
    () => ({
        usuario: null
    })
);

vi.mock(
    "../src/context/AuthContext",
    () => ({
        useAuth: () => ({
            token: "test-token",
            usuario: authState.usuario,
            isAuthenticated: true,
            logout: vi.fn()
        })
    })
);

vi.mock(
    "../src/components/notificationBell/NotificationBell",
    () => ({
        default: () => null
    })
);

describe("navegación consciente del rol", () => {
    beforeEach(() => {
        authState.usuario = {
            nombres: "María",
            apellidos: "Vendedora",
            nombreCompleto: "María Vendedora",
            rol: {
                codigo: "VENDEDOR",
                nombre: "Vendedor"
            },
            permisos: [
                {
                    codigo: "PEDIDO_VER"
                },
                {
                    codigo: "VENTA_CREAR"
                }
            ]
        };
    });

    it.each([
        [
            "VENDEDOR",
            "Vendedor",
            "PEDIDO_VER",
            "/operacion/pedidos"
        ],
        [
            "MOZO",
            "Mozo",
            "ENTREGA_REGISTRAR",
            "/operacion/entregas"
        ],
        [
            "COCINA",
            "Cocina",
            "COMANDA_VER",
            "/operacion/cocina"
        ]
    ])(
        "permite a %s volver desde la página pública",
        (
            roleCode,
            roleName,
            permission,
            expectedPath
        ) => {
            authState.usuario = {
                ...authState.usuario,
                rol: {
                    codigo: roleCode,
                    nombre: roleName
                },
                permisos: [
                    {
                        codigo: permission
                    }
                ]
            };

            render(
                <MemoryRouter>
                    <Navbar titulo="El Vallecito" />
                </MemoryRouter>
            );

            expect(
                screen.getByRole("link", {
                    name: `Volver al área de ${roleName}`
                })
            ).toHaveAttribute(
                "href",
                expectedPath
            );
        }
    );

    it("conecta marca, usuario y Mi área con el espacio del vendedor", () => {
        render(
            <MemoryRouter>
                <SessionHeader title="Área de Vendedor" />
            </MemoryRouter>
        );

        expect(
            screen.getByRole("link", {
                name: "Volver al área de Vendedor"
            })
        ).toHaveAttribute(
            "href",
            "/operacion/pedidos"
        );

        expect(
            screen.getByRole("link", {
                name: "Abrir el área de Vendedor"
            })
        ).toHaveAttribute(
            "href",
            "/operacion/pedidos"
        );

        expect(
            screen.getByRole("link", {
                name: "Mi área"
            })
        ).toHaveAttribute(
            "href",
            "/operacion/pedidos"
        );
    });
});
