import {
    FaCalendarAlt,
    FaGift
} from "react-icons/fa";

import {
    NavLink
} from "react-router-dom";

import "./clientNav.css";

function ClientNav() {
    return (
        <nav className="client-nav">
            <NavLink
                to="/reservations"
                className={({
                    isActive
                }) =>
                    isActive
                        ? "client-nav-link active"
                        : "client-nav-link"
                }
            >
                <FaCalendarAlt />

                <span>
                    Mis reservas
                </span>
            </NavLink>

            <NavLink
                to="/fidelizacion"
                className={({
                    isActive
                }) =>
                    isActive
                        ? "client-nav-link active"
                        : "client-nav-link"
                }
            >
                <FaGift />

                <span>
                    Mi fidelización
                </span>
            </NavLink>
        </nav>
    );
}

export default ClientNav;