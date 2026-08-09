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

import Login from "../src/pages/login/login";

vi.mock(
    "../src/context/AuthContext",
    () => ({
        useAuth: () => ({
            login: vi.fn(),
            loginWithGoogle: vi.fn(),
            register: vi.fn()
        })
    })
);

vi.mock(
    "../src/pages/login/GoogleAuthButton",
    () => ({
        default: () => <div>Acceso con Google</div>
    })
);

describe("navegación del inicio de sesión", () => {
    it("permite volver a la página principal desde el logo", () => {
        render(
            <MemoryRouter initialEntries={["/login"]}>
                <Login />
            </MemoryRouter>
        );

        expect(
            screen.getByRole("link", {
                name: "Volver a la página principal"
            })
        ).toHaveAttribute("href", "/");
    });
});
