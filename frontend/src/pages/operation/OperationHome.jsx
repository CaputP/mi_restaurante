import {
    Navigate
} from "react-router-dom";

import {
    useAuth
} from "../../context/AuthContext";

function OperationHome() {
    const {
        usuario
    } = useAuth();

    const roleCode =
        usuario?.rol?.codigo;

    const permissions = new Set(
        usuario?.permisos?.map(
            (permission) => permission.codigo
        ) ?? []
    );

    const candidates = [
        {
            path: "/operacion/pedidos",
            roles: [
                "ADMINISTRADOR_GENERAL",
                "ADMINISTRADOR_SUCURSAL",
                "VENDEDOR"
            ],
            permission: "PEDIDO_VER"
        },
        {
            path: "/operacion/cocina",
            roles: [
                "ADMINISTRADOR_GENERAL",
                "ADMINISTRADOR_SUCURSAL",
                "COCINA"
            ],
            permission: "COMANDA_VER"
        },
        {
            path: "/operacion/entregas",
            roles: [
                "ADMINISTRADOR_GENERAL",
                "ADMINISTRADOR_SUCURSAL",
                "MOZO"
            ],
            permission: "ENTREGA_REGISTRAR"
        },
        {
            path: "/operacion/ventas",
            roles: [
                "ADMINISTRADOR_GENERAL",
                "ADMINISTRADOR_SUCURSAL",
                "VENDEDOR"
            ],
            permission: "VENTA_CREAR"
        }
    ];

    const destination = candidates.find(
        (candidate) =>
            candidate.roles.includes(roleCode) &&
            permissions.has(candidate.permission)
    )?.path ?? "/";

    return (
        <Navigate
            to={
                destination
            }
            replace
        />
    );
}

export default OperationHome;
