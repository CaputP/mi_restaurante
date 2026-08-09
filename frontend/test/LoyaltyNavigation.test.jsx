import {
    render,
    screen
} from "@testing-library/react";
import {
    MemoryRouter,
    Route,
    Routes
} from "react-router-dom";
import {
    describe,
    expect,
    it,
    vi
} from "vitest";

import AdminSidebar from "../src/components/adminSidebar/AdminSidebar";
import LoyaltyLayout from "../src/pages/admin/loyalty/LoyaltyLayout";

vi.mock(
    "../src/context/AuthContext",
    () => ({
        useAuth: () => ({
            usuario: {
                nombres: "Administrador",
                rol: {
                    codigo: "ADMINISTRADOR_GENERAL",
                    nombre: "Administrador general"
                },
                permisos: [
                    {
                        codigo: "FIDELIZACION_GESTIONAR"
                    }
                ]
            }
        })
    })
);

describe("navegación de fidelización", () => {
    it("mantiene una sola entrada activa en el menú principal", () => {
        render(
            <MemoryRouter
                initialEntries={[
                    "/admin/fidelizacion/clientes"
                ]}
            >
                <AdminSidebar
                    isOpen
                    onClose={() => {}}
                />
            </MemoryRouter>
        );

        const loyaltyLink =
            screen.getByRole(
                "link",
                {
                    name: "Fidelización"
                }
            );

        expect(
            loyaltyLink
        ).toHaveClass("active");
        expect(
            screen.queryByRole(
                "link",
                {
                    name: "Clientes y premios"
                }
            )
        ).not.toBeInTheDocument();
    });

    it("activa únicamente la sección interna correspondiente", () => {
        render(
            <MemoryRouter
                initialEntries={[
                    "/admin/fidelizacion/clientes"
                ]}
            >
                <Routes>
                    <Route
                        path="/admin/fidelizacion"
                        element={<LoyaltyLayout />}
                    >
                        <Route
                            index
                            element={<p>Programas</p>}
                        />
                        <Route
                            path="clientes"
                            element={<p>Clientes</p>}
                        />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        const programsLink =
            screen.getByRole(
                "link",
                {
                    name: /Programas/
                }
            );
        const customersLink =
            screen.getByRole(
                "link",
                {
                    name: /Clientes y premios/
                }
            );

        expect(
            programsLink
        ).not.toHaveClass("active");
        expect(
            customersLink
        ).toHaveClass("active");
        expect(
            screen.getByText("Clientes")
        ).toBeInTheDocument();
    });
});
