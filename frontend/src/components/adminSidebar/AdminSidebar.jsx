import {
    FaBoxes,
    FaCalendarCheck,
    FaCashRegister,
    FaChartBar,
    FaChartLine,
    FaClipboardList,
    FaCog,
    FaGift,
    FaStore,
    FaTimes,
    FaUsers,
    FaUtensils,
    FaFireAlt,
    FaTruck,
    FaTags,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import "./adminSidebar.css";

const menuItems = [
    {
        nombre: "Resumen",
        ruta: "/admin",
        icono: FaChartLine,
        end: true
    },
    {
        nombre: "Reservas",
        ruta: "/admin/reservas",
        icono: FaCalendarCheck
    },
    {
        nombre: "Pedidos",
        ruta: "/admin/pedidos",
        icono: FaClipboardList
    },
    {
        nombre: "Comandas",
        ruta: "/admin/comandas",
        icono: FaFireAlt
    },
    {
        nombre: "Entregas",
        ruta: "/admin/entregas",
        icono: FaTruck
    },
    {
        nombre: "Ventas y caja",
        ruta: "/admin/ventas",
        icono: FaCashRegister
    },
    {
        nombre: "Productos",
        ruta: "/admin/productos",
        icono: FaUtensils
    },
    {
        nombre: "Inventario",
        ruta: "/admin/inventario",
        icono: FaBoxes
    },
    {
        nombre: "Usuarios",
        ruta: "/admin/usuarios",
        icono: FaUsers
    },
    {
        nombre: "Sucursales",
        ruta: "/admin/sucursales",
        icono: FaStore,
        soloAdministradorGeneral: true
    },
    {
        nombre: "Reportes",
        ruta: "/admin/reportes",
        icono: FaChartBar
    },
    {
        nombre: "Fidelización",
        ruta: "/admin/fidelizacion",
        icono: FaGift
    },
    {
        nombre: "Clientes y premios",
        ruta: "/admin/fidelizacion/clientes",
        icono: FaUsers
    },
    {
        nombre: "Promociones",
        ruta: "/admin/promociones",
        icono: FaTags
    },
    {
        nombre: "Configuración",
        ruta: "/admin/configuracion",
        icono: FaCog
    }
];

function AdminSidebar({
    isOpen,
    onClose
}) {
    const { usuario } = useAuth();

    const esAdministradorGeneral =
        usuario.rol.codigo ===
        "ADMINISTRADOR_GENERAL";

    const opcionesVisibles = menuItems.filter(
        (opcion) =>
            !opcion.soloAdministradorGeneral ||
            esAdministradorGeneral
    );

    return (
        <aside
            className={`admin-sidebar ${
                isOpen ? "open" : ""
            }`}
        >
            <div className="admin-sidebar-header">
                <div>
                    <span className="admin-sidebar-label">
                        SISTEMA
                    </span>

                    <h2>Administración</h2>
                </div>

                <button
                    type="button"
                    className="admin-sidebar-close"
                    aria-label="Cerrar menú"
                    onClick={onClose}
                >
                    <FaTimes />
                </button>
            </div>

            <nav
                className="admin-sidebar-nav"
                aria-label="Menú administrativo"
            >
                {opcionesVisibles.map((opcion) => {
                    const Icono = opcion.icono;

                    return (
                        <NavLink
                            key={opcion.ruta}
                            to={opcion.ruta}
                            end={opcion.end}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `admin-sidebar-link ${
                                    isActive
                                        ? "active"
                                        : ""
                                }`
                            }
                        >
                            <Icono />

                            <span>{opcion.nombre}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="admin-sidebar-footer">
                <strong>
                    {usuario.nombres}
                </strong>

                <span>{usuario.rol.nombre}</span>
            </div>
        </aside>
    );
}

export default AdminSidebar;