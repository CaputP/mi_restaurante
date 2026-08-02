export function getHomePathByRole(
    roleCode
) {
    switch (roleCode) {
        case "ADMINISTRADOR_GENERAL":
        case "ADMINISTRADOR_SUCURSAL":
            return "/admin";

        case "COCINA":
            return "/operacion/cocina";

        case "MOZO":
            return "/operacion/entregas";

        case "VENDEDOR":
            return "/operacion/pedidos";

        case "CLIENTE":
        case "USUARIO":
            return "/reservations";

        default:
            return "/";
    }
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