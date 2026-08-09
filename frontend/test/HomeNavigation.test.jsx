import {
    render,
    screen
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
    describe,
    expect,
    it,
    vi
} from "vitest";

import Home from "../src/pages/home";

vi.mock(
    "../src/context/AuthContext",
    () => ({
        useAuth: () => ({
            usuario: null,
            isAuthenticated: false,
            logout: vi.fn()
        })
    })
);

describe("navegación de la página principal", () => {
    it("conecta todas las llamadas a la acción con destinos reales", () => {
        render(
            <MemoryRouter>
                <Home />
            </MemoryRouter>
        );

        expect(
            screen.getByRole("link", {
                name: "Ver Carta"
            })
        ).toHaveAttribute(
            "href",
            "#platos"
        );

        expect(
            screen.getByRole("link", {
                name: "Reservar"
            })
        ).toHaveAttribute(
            "href",
            "/reservations"
        );

        for (const dishLink of screen.getAllByRole(
            "link",
            {
                name: /Reservar después de ver/
            }
        )) {
            expect(dishLink).toHaveAttribute(
                "href",
                "/reservations"
            );
        }

        expect(
            screen.getByRole("link", {
                name: "Conoce más"
            })
        ).toHaveAttribute(
            "href",
            "#galeria"
        );
    });

    it("ofrece contacto directo y ubicación desde la página", () => {
        render(
            <MemoryRouter>
                <Home />
            </MemoryRouter>
        );

        expect(
            screen.getByRole("link", {
                name: "Llamar al 994 744 356"
            })
        ).toHaveAttribute(
            "href",
            "tel:+51994744356"
        );

        expect(
            screen.getByRole("link", {
                name: "Escribir por WhatsApp al 994 744 356"
            })
        ).toHaveAttribute(
            "href",
            "https://wa.me/51994744356"
        );

        expect(
            screen.getByRole("link", {
                name: "Abrir la ubicación en Google Maps"
            })
        ).toHaveAttribute(
            "target",
            "_blank"
        );
    });
});
