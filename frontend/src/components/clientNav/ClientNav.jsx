import {
    FaCalendarAlt,
    FaGift
} from "react-icons/fa";
import { NavLink } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import "./clientNav.css";

function ClientNav() {
    const { usuario } = useAuth();
    const permissions = new Set(
        usuario?.permisos?.map(
            (permission) => permission.codigo
        ) ?? []
    );

    return (
        <nav className="client-nav">
            {permissions.has("RESERVA_CREAR") && (
                <NavLink
                    to="/reservations"
                    className={({ isActive }) =>
                        isActive
                            ? "client-nav-link active"
                            : "client-nav-link"
                    }
                >
                    <FaCalendarAlt />
                    <span>Mis reservas</span>
                </NavLink>
            )}

            {permissions.has("CLIENTE_PREMIOS_VER") && (
                <NavLink
                    to="/fidelizacion"
                    className={({ isActive }) =>
                        isActive
                            ? "client-nav-link active"
                            : "client-nav-link"
                    }
                >
                    <FaGift />
                    <span>Mi fidelización</span>
                </NavLink>
            )}
        </nav>
    );
}

export default ClientNav;
