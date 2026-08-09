import {
    describe,
    expect,
    it
} from "vitest";

import {
    getHomePathByRole,
    getSaleTicketPath,
    getSaleVoidPath,
    getSalesWorkspacePath
} from "../src/utils/roleRoutes";

describe("getHomePathByRole", () => {
    it.each([
        [
            "ADMINISTRADOR_GENERAL",
            "/admin"
        ],
        [
            "ADMINISTRADOR_SUCURSAL",
            "/admin"
        ],
        [
            "COCINA",
            "/operacion/cocina"
        ],
        [
            "MOZO",
            "/operacion/entregas"
        ],
        [
            "VENDEDOR",
            "/operacion/pedidos"
        ],
        [
            "CLIENTE",
            "/reservations"
        ]
    ])(
        "envía %s a %s",
        (role, expectedPath) => {
            expect(
                getHomePathByRole(role)
            ).toBe(expectedPath);
        }
    );

    it("elige la primera ruta realmente autorizada", () => {
        expect(
            getHomePathByRole(
                "ADMINISTRADOR_SUCURSAL",
                [
                    {
                        codigo: "REPORTE_VER"
                    }
                ]
            )
        ).toBe("/admin/reportes");

        expect(
            getHomePathByRole(
                "VENDEDOR",
                ["VENTA_CREAR"]
            )
        ).toBe("/operacion/ventas");
    });

    it("conserva el contexto correcto al navegar ventas", () => {
        expect(
            getSalesWorkspacePath(
                "VENDEDOR",
                "/"
            )
        ).toBe("/operacion/ventas");

        expect(
            getSalesWorkspacePath(
                "ADMINISTRADOR_GENERAL",
                "/operacion/pedidos"
            )
        ).toBe("/operacion/ventas");

        expect(
            getSalesWorkspacePath(
                "ADMINISTRADOR_GENERAL",
                "/admin/ventas"
            )
        ).toBe("/admin/ventas");
    });

    it("construye rutas de ticket y anulación para vendedores", () => {
        expect(
            getSaleTicketPath(
                "VENDEDOR",
                "/operacion/ventas",
                "venta-1"
            )
        ).toBe(
            "/operacion/ventas/ticket/venta-1"
        );

        expect(
            getSaleVoidPath(
                "VENDEDOR",
                "/operacion/ventas",
                "venta-1"
            )
        ).toBe(
            "/operacion/ventas/anular/venta-1"
        );
    });
});
