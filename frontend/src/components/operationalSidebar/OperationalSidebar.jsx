import {
    FaCashRegister,
    FaClipboardList,
    FaConciergeBell,
    FaHome,
    FaSignOutAlt,
    FaTimes,
    FaUtensils
} from "react-icons/fa";

import {
    NavLink,
    useNavigate
} from "react-router-dom";

import {
    useAuth
} from "../../context/AuthContext";

import {
    getRoleDisplayName
} from "../../utils/roleRoutes";

import logo from "../../assets/images/logo.webp";

import "./operationalSidebar.css";

const ROLE_MENU_ITEMS = {
    COCINA: [
        {
            path:
                "/operacion/cocina",

            label:
                "Comandas",

            permission:
                "COMANDA_VER",

            icon:
                FaUtensils
        }
    ],

    MOZO: [
        {
            path:
                "/operacion/entregas",

            label:
                "Entregas",

            permission:
                "ENTREGA_REGISTRAR",

            icon:
                FaConciergeBell
        }
    ],

    VENDEDOR: [
        {
            path:
                "/operacion/pedidos",

            label:
                "Pedidos",

            permission:
                "PEDIDO_VER",

            icon:
                FaClipboardList
        },
        {
            path:
                "/operacion/ventas",

            label:
                "Ventas y caja",

            permission:
                "VENTA_CREAR",

            icon:
                FaCashRegister
        }
    ],

    ADMINISTRADOR_GENERAL: [
        {
            path:
                "/operacion/pedidos",

            label:
                "Pedidos",

            permission:
                "PEDIDO_VER",

            icon:
                FaClipboardList
        },
        {
            path:
                "/operacion/cocina",

            label:
                "Comandas",

            permission:
                "COMANDA_VER",

            icon:
                FaUtensils
        },
        {
            path:
                "/operacion/entregas",

            label:
                "Entregas",

            permission:
                "ENTREGA_REGISTRAR",

            icon:
                FaConciergeBell
        },
        {
            path:
                "/operacion/ventas",

            label:
                "Ventas y caja",

            permission:
                "VENTA_CREAR",

            icon:
                FaCashRegister
        }
    ],

    ADMINISTRADOR_SUCURSAL: [
        {
            path:
                "/operacion/pedidos",

            label:
                "Pedidos",

            permission:
                "PEDIDO_VER",

            icon:
                FaClipboardList
        },
        {
            path:
                "/operacion/cocina",

            label:
                "Comandas",

            permission:
                "COMANDA_VER",

            icon:
                FaUtensils
        },
        {
            path:
                "/operacion/entregas",

            label:
                "Entregas",

            permission:
                "ENTREGA_REGISTRAR",

            icon:
                FaConciergeBell
        },
        {
            path:
                "/operacion/ventas",

            label:
                "Ventas y caja",

            permission:
                "VENTA_CREAR",

            icon:
                FaCashRegister
        }
    ]
};

function OperationalSidebar({
    isOpen,
    onClose
}) {
    const navigate =
        useNavigate();

    const {
        usuario,
        logout
    } = useAuth();

    const roleCode =
        usuario?.rol?.codigo ?? "";

    const grantedPermissions = new Set(
        usuario?.permisos?.map(
            (permission) => permission.codigo
        ) ?? []
    );

    const menuItems =
        ROLE_MENU_ITEMS[
            roleCode
        ]?.filter(
            (item) =>
                grantedPermissions.has(
                    item.permission
                )
        ) ?? [];

    const isAdministrator =
        [
            "ADMINISTRADOR_GENERAL",
            "ADMINISTRADOR_SUCURSAL"
        ].includes(
            roleCode
        );

    async function handleLogout() {
        await logout();

        navigate(
            "/login",
            {
                replace:
                    true
            }
        );
    }

    return (
        <aside
            className={`operational-sidebar ${
                isOpen
                    ? "open"
                    : ""
            }`}
        >
            <div className="operational-sidebar-header">
                <div className="operational-brand">
                    <img
                        src={logo}
                        alt="El Vallecito de Chocco"
                    />

                    <div>
                        <strong>
                            El Vallecito
                        </strong>

                        <span>
                            Operaciones
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    className="operational-sidebar-close"
                    aria-label="Cerrar menú"
                    onClick={
                        onClose
                    }
                >
                    <FaTimes />
                </button>
            </div>

            <div className="operational-user-card">
                <span>
                    Sesión actual
                </span>

                <strong>
                    {usuario
                        ? `${usuario.nombres} ${usuario.apellidos}`
                        : "Usuario"}
                </strong>

                <small>
                    {getRoleDisplayName(
                        roleCode
                    )}
                </small>
            </div>

            <nav className="operational-navigation">
                {isAdministrator && (
                    <NavLink
                        to="/admin"
                        onClick={
                            onClose
                        }
                        className={({
                            isActive
                        }) =>
                            isActive
                                ? "active"
                                : ""
                        }
                    >
                        <FaHome />

                        <span>
                            Administración
                        </span>
                    </NavLink>
                )}

                {menuItems.map(
                    (item) => {
                        const Icon =
                            item.icon;

                        return (
                            <NavLink
                                key={
                                    item.path
                                }
                                to={
                                    item.path
                                }
                                onClick={
                                    onClose
                                }
                                className={({
                                    isActive
                                }) =>
                                    isActive
                                        ? "active"
                                        : ""
                                }
                            >
                                <Icon />

                                <span>
                                    {item.label}
                                </span>
                            </NavLink>
                        );
                    }
                )}
            </nav>

            <div className="operational-sidebar-footer">
                <button
                    type="button"
                    onClick={
                        handleLogout
                    }
                >
                    <FaSignOutAlt />
                    Cerrar sesión
                </button>
            </div>
        </aside>
    );
}

export default OperationalSidebar;
