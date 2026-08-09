export function getHomePathByRole(
    roleCode,
    permissions
) {
    const permissionCodes =
        permissions === undefined
            ? null
            : new Set(
                permissions.map(
                    (permission) =>
                        typeof permission === "string"
                            ? permission
                            : permission.codigo
                )
            );
    const can = (permission) =>
        permissionCodes === null ||
        permissionCodes.has(permission);

    switch (roleCode) {
        case "ADMINISTRADOR_GENERAL":
        case "ADMINISTRADOR_SUCURSAL":
            if (can("DASHBOARD_VER")) return "/admin";
            if (can("RESERVA_CREAR")) return "/admin/reservas";
            if (can("PEDIDO_VER")) return "/admin/pedidos";
            if (can("COMANDA_VER")) return "/admin/comandas";
            if (can("ENTREGA_REGISTRAR")) return "/admin/entregas";
            if (can("VENTA_CREAR")) return "/admin/ventas";
            if (can("PRODUCTO_GESTIONAR")) return "/admin/productos";
            if (can("INVENTARIO_VER")) return "/admin/inventario";
            if (can("USUARIO_GESTIONAR")) return "/admin/usuarios";
            if (can("REPORTE_VER")) return "/admin/reportes";
            return "/";

        case "COCINA":
            return can("COMANDA_VER")
                ? "/operacion/cocina"
                : "/";

        case "MOZO":
            return can("ENTREGA_REGISTRAR")
                ? "/operacion/entregas"
                : "/";

        case "VENDEDOR":
            if (can("PEDIDO_VER")) {
                return "/operacion/pedidos";
            }
            return can("VENTA_CREAR")
                ? "/operacion/ventas"
                : "/";

        case "CLIENTE":
            if (can("RESERVA_CREAR")) {
                return "/reservations";
            }
            return can("CLIENTE_PREMIOS_VER")
                ? "/fidelizacion"
                : "/";

        default:
            return "/";
    }
}

export function getSalesWorkspacePath(
    roleCode,
    currentPath = ""
) {
    const isOperationalPath =
        currentPath === "/operacion" ||
        currentPath.startsWith(
            "/operacion/"
        );

    return roleCode === "VENDEDOR" ||
        isOperationalPath
        ? "/operacion/ventas"
        : "/admin/ventas";
}

export function getSaleTicketPath(
    roleCode,
    currentPath,
    saleId
) {
    return `${getSalesWorkspacePath(
        roleCode,
        currentPath
    )}/ticket/${encodeURIComponent(saleId)}`;
}

export function getSaleVoidPath(
    roleCode,
    currentPath,
    saleId
) {
    return `${getSalesWorkspacePath(
        roleCode,
        currentPath
    )}/anular/${encodeURIComponent(saleId)}`;
}

export function getRoleDisplayName(
    roleCode
) {
    const roleNames = {
        ADMINISTRADOR_GENERAL:
            "Administrador general",

        ADMINISTRADOR_SUCURSAL:
            "Administrador de sucursal",

        VENDEDOR:
            "Vendedor",

        MOZO:
            "Mozo",

        COCINA:
            "Cocina",

        CLIENTE:
            "Cliente"
    };

    return (
        roleNames[roleCode] ??
        "Usuario"
    );
}
