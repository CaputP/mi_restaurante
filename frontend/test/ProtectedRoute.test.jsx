import {
    render,
    screen
} from "@testing-library/react";
import {
    MemoryRouter,
    Route,
    Routes,
    useLocation
} from "react-router-dom";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi
} from "vitest";

import ProtectedRoute from "../src/routes/ProtectedRoute";

const useAuthMock = vi.fn();

vi.mock(
    "../src/context/AuthContext",
    () => ({
        useAuth: () =>
            useAuthMock()
    })
);

function renderProtectedRoute(
    allowedRoles = [],
    requiredPermissions = []
) {
    function LoginProbe() {
        const location = useLocation();

        return (
            <>
                <p>Ingreso</p>
                <p>{location.state?.from}</p>
            </>
        );
    }

    return render(
        <MemoryRouter initialEntries={["/private"]}>
            <Routes>
                <Route
                    path="/"
                    element={<p>Inicio</p>}
                />
                <Route
                    path="/admin"
                    element={<p>Área administrativa</p>}
                />
                <Route
                    path="/reservations"
                    element={<p>Área de cliente</p>}
                />
                <Route
                    path="/operacion/pedidos"
                    element={<p>Área de vendedor</p>}
                />
                <Route
                    path="/login"
                    element={<LoginProbe />}
                />
                <Route
                    path="/private"
                    element={(
                        <ProtectedRoute
                            allowedRoles={allowedRoles}
                            requiredPermissions={requiredPermissions}
                        >
                            <p>Contenido privado</p>
                        </ProtectedRoute>
                    )}
                />
            </Routes>
        </MemoryRouter>
    );
}

describe("ProtectedRoute", () => {
    beforeEach(() => {
        useAuthMock.mockReset();
    });

    it("espera mientras se restaura la sesión", () => {
        useAuthMock.mockReturnValue({
            usuario: null,
            isAuthenticated: false,
            isLoadingSession: true
        });

        renderProtectedRoute();

        expect(
            screen.getByText(
                "Comprobando sesión..."
            )
        ).toBeInTheDocument();
    });

    it("redirige al login cuando no hay sesión", () => {
        useAuthMock.mockReturnValue({
            usuario: null,
            isAuthenticated: false,
            isLoadingSession: false
        });

        renderProtectedRoute();

        expect(
            screen.getByText("Ingreso")
        ).toBeInTheDocument();

        expect(
            screen.getByText("/private")
        ).toBeInTheDocument();
    });

    it("bloquea roles no autorizados", () => {
        useAuthMock.mockReturnValue({
            usuario: {
                rol: {
                    codigo: "CLIENTE"
                }
            },
            isAuthenticated: true,
            isLoadingSession: false
        });

        renderProtectedRoute([
            "ADMINISTRADOR_GENERAL"
        ]);

        expect(
            screen.getByText(
                "Área de cliente"
            )
        ).toBeInTheDocument();
    });

    it("muestra el contenido al rol permitido", () => {
        useAuthMock.mockReturnValue({
            usuario: {
                rol: {
                    codigo:
                        "ADMINISTRADOR_GENERAL"
                }
            },
            isAuthenticated: true,
            isLoadingSession: false
        });

        renderProtectedRoute([
            "ADMINISTRADOR_GENERAL"
        ]);

        expect(
            screen.getByText(
                "Contenido privado"
            )
        ).toBeInTheDocument();
    });

    it("bloquea una ruta cuando falta el permiso requerido", () => {
        useAuthMock.mockReturnValue({
            usuario: {
                rol: {
                    codigo: "ADMINISTRADOR_GENERAL"
                },
                permisos: [
                    {
                        codigo: "DASHBOARD_VER"
                    }
                ]
            },
            isAuthenticated: true,
            isLoadingSession: false
        });

        renderProtectedRoute(
            ["ADMINISTRADOR_GENERAL"],
            ["REPORTE_VER"]
        );

        expect(
            screen.getByText(
                "Área administrativa"
            )
        ).toBeInTheDocument();
    });

    it("devuelve al vendedor a su área si intenta abrir una ruta ajena", () => {
        useAuthMock.mockReturnValue({
            usuario: {
                rol: {
                    codigo: "VENDEDOR"
                },
                permisos: [
                    {
                        codigo: "PEDIDO_VER"
                    },
                    {
                        codigo: "VENTA_CREAR"
                    }
                ]
            },
            isAuthenticated: true,
            isLoadingSession: false
        });

        renderProtectedRoute([
            "ADMINISTRADOR_GENERAL"
        ]);

        expect(
            screen.getByText(
                "Área de vendedor"
            )
        ).toBeInTheDocument();
    });
});
