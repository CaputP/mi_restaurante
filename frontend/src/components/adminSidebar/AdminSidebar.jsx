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
    FaDatabase,
    FaUserShield,
    FaBookOpen,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import "./AdminSidebar.css";

const menuItems = [
    {
        nombre: "Resumen",
        ruta: "/admin",
        icono: FaChartLine,
        end: true,
        permiso: "DASHBOARD_VER"
    },
    {
        nombre: "Reservas",
        ruta: "/admin/reservas",
        icono: FaCalendarCheck,
        permiso: "RESERVA_CREAR"
    },
    {
        nombre: "Pedidos",
        ruta: "/admin/pedidos",
        icono: FaClipboardList,
        permiso: "PEDIDO_VER"
    },
    {
        nombre: "Comandas",
        ruta: "/admin/comandas",
        icono: FaFireAlt,
        permiso: "COMANDA_VER"
    },
    {
        nombre: "Entregas",
        ruta: "/admin/entregas",
        icono: FaTruck,
        permiso: "ENTREGA_REGISTRAR"
    },
    {
        nombre: "Ventas y caja",
        ruta: "/admin/ventas",
        icono: FaCashRegister,
        permiso: "VENTA_CREAR"
    },
    {
        nombre: "Productos",
        ruta: "/admin/productos",
        icono: FaUtensils,
        permiso: "PRODUCTO_GESTIONAR"
    },
    {
        nombre: "Inventario",
        ruta: "/admin/inventario",
        icono: FaBoxes,
        permiso: "INVENTARIO_VER"
    },
    {
        nombre: "Usuarios",
        ruta: "/admin/usuarios",
        icono: FaUsers,
        permiso: "USUARIO_GESTIONAR"
    },
    {
        nombre: "Roles y permisos",
        ruta: "/admin/roles",
        icono: FaUserShield,
        soloAdministradorGeneral: true,
        permiso: "ROL_GESTIONAR"
    },
    {
        nombre: "Sucursales",
        ruta: "/admin/sucursales",
        icono: FaStore,
        soloAdministradorGeneral: true,
        permiso: "SUCURSAL_GESTIONAR"
    },
    {
        nombre: "Reportes",
        ruta: "/admin/reportes",
        icono: FaChartBar,
        permiso: "REPORTE_VER"
    },
    {
        nombre: "Fidelización",
        ruta: "/admin/fidelizacion",
        icono: FaGift,
        permiso: "FIDELIZACION_GESTIONAR"
    },
    {
        nombre: "Promociones",
        ruta: "/admin/promociones",
        icono: FaTags,
        permiso: "PROMOCION_GESTIONAR"
    },
    {
        nombre: "Configuración",
        ruta: "/admin/configuracion",
        icono: FaCog,
        permiso: "CONFIGURACION_GESTIONAR"
    },
    {
        nombre: "Respaldos",
        ruta: "/admin/respaldos",
        icono: FaDatabase,
        soloAdministradorGeneral: true,
        permiso: "RESPALDO_GESTIONAR"
    },
    {
        nombre: "Libro de Reclamaciones",
        ruta: "/admin/reclamaciones",
        icono: FaBookOpen,
        permiso: "RECLAMO_GESTIONAR"
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

    const permisos = new Set(
        usuario.permisos?.map(
            (permiso) => permiso.codigo
        ) ?? []
    );

    const opcionesVisibles = menuItems.filter(
        (opcion) =>
            (
                !opcion.soloAdministradorGeneral ||
                esAdministradorGeneral
            ) &&
            (
                !opcion.permiso ||
                permisos.has(opcion.permiso)
            )
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
