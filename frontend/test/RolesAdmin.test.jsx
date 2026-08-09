import {
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

import RolesAdmin from "../src/pages/admin/roles/RolesAdmin";
import {
    ApiError
} from "../src/services/api";

const serviceMocks = vi.hoisted(
    () => ({
        getRolesRequest: vi.fn(),
        updateRolePermissionsRequest: vi.fn()
    })
);

vi.mock(
    "../src/context/AuthContext",
    () => ({
        useAuth: () => ({
            token: "cookie-session"
        })
    })
);

vi.mock(
    "../src/services/role.service",
    () => serviceMocks
);

const rolesData = {
    roles: [
        {
            id: "role-vendedor",
            codigo: "VENDEDOR",
            nombre: "Vendedor",
            descripcion: "Atención de pedidos y ventas",
            editable: true,
            usuariosAsignados: 2,
            permisoIds: [
                "permission-orders"
            ]
        }
    ],
    permisos: [
        {
            id: "permission-orders",
            codigo: "PEDIDO_VER",
            nombre: "Ver pedidos",
            descripcion: "Consulta pedidos",
            modulo: "PEDIDOS"
        }
    ]
};

describe("RolesAdmin", () => {
    beforeEach(() => {
        serviceMocks.getRolesRequest.mockReset();
        serviceMocks.updateRolePermissionsRequest.mockReset();
        serviceMocks.getRolesRequest.mockResolvedValue(
            rolesData
        );
    });

    it("solo abre la confirmación al guardar y permite cancelarla", async () => {
        const user = userEvent.setup();
        render(<RolesAdmin />);

        const saveButton = await screen.findByRole(
            "button",
            {
                name: "Guardar permisos"
            }
        );

        expect(
            screen.queryByRole("dialog")
        ).not.toBeInTheDocument();

        await user.click(saveButton);

        expect(
            screen.getByRole("dialog", {
                name: "Confirmar cambio de permisos"
            })
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", {
                name: "Cancelar"
            })
        );

        expect(
            screen.queryByRole("dialog")
        ).not.toBeInTheDocument();
    });

    it("cierra la confirmación después de validar la contraseña", async () => {
        const user = userEvent.setup();
        serviceMocks.updateRolePermissionsRequest.mockResolvedValue({
            message: "Permisos actualizados.",
            data: {
                rol: {
                    id: "role-vendedor",
                    permisoIds: [
                        "permission-orders"
                    ],
                    sesionesInvalidadas: 2
                }
            }
        });

        render(<RolesAdmin />);

        await user.click(
            await screen.findByRole("button", {
                name: "Guardar permisos"
            })
        );
        await user.type(
            screen.getByLabelText(
                "Contraseña del administrador"
            ),
            "Admin12345!"
        );
        await user.click(
            screen.getByRole("button", {
                name: "Confirmar"
            })
        );

        await waitFor(() => {
            expect(
                screen.queryByRole("dialog")
            ).not.toBeInTheDocument();
        });

        expect(
            serviceMocks.updateRolePermissionsRequest
        ).toHaveBeenCalledWith(
            "cookie-session",
            "role-vendedor",
            ["permission-orders"],
            "Admin12345!"
        );
    });

    it("muestra la contraseña incorrecta dentro del diálogo", async () => {
        const user = userEvent.setup();
        serviceMocks.updateRolePermissionsRequest.mockRejectedValue(
            new ApiError(
                "La contraseña de confirmación no es correcta.",
                401,
                "REAUTENTICACION_FALLIDA"
            )
        );

        render(<RolesAdmin />);

        await user.click(
            await screen.findByRole("button", {
                name: "Guardar permisos"
            })
        );
        await user.type(
            screen.getByLabelText(
                "Contraseña del administrador"
            ),
            "incorrecta"
        );
        await user.click(
            screen.getByRole("button", {
                name: "Confirmar"
            })
        );

        expect(
            await screen.findByRole("alert")
        ).toHaveTextContent(
            "La contraseña de confirmación no es correcta."
        );

        expect(
            screen.getByRole("dialog")
        ).toBeInTheDocument();
    });
});
