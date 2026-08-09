import {
    FaBars,
    FaHome,
    FaSignOutAlt,
    FaUserCircle
} from "react-icons/fa";
import {
    Link,
    useNavigate
} from "react-router-dom";

import NotificationBell from "../notificationBell/NotificationBell";
import { useAuth } from "../../context/AuthContext";
import {
    getHomePathByRole,
    getRoleDisplayName
} from "../../utils/roleRoutes";
import logo from "../../assets/images/logo.webp";
import "./SessionHeader.css";

function SessionHeader({
    title,
    onMenuToggle
}) {
    const navigate = useNavigate();

    const {
        token,
        usuario,
        logout
    } = useAuth();

    const roleHomePath =
        getHomePathByRole(
            usuario?.rol?.codigo,
            usuario?.permisos
        );
    const roleDisplayName =
        getRoleDisplayName(
            usuario?.rol?.codigo
        );

    async function handleLogout() {
        await logout();

        navigate("/login", {
            replace: true
        });
    }

    return (
        <header className="session-header">
            <div className="session-header-left">
                {onMenuToggle && (
                    <button
                        type="button"
                        className="session-menu-button"
                        aria-label="Abrir menú administrativo"
                        onClick={onMenuToggle}
                    >
                        <FaBars />
                    </button>
                )}

                <Link
                    to={roleHomePath}
                    className="session-header-brand"
                    aria-label={`Volver al área de ${roleDisplayName}`}
                >
                    <img
                        src={logo}
                        alt="El Vallecito de Chocco"
                    />

                    <div>
                        <h1>{title}</h1>
                        <p>El Vallecito de Chocco</p>
                    </div>
                </Link>
            </div>

            <div className="session-header-actions">
                <div className="session-header-actions">
                    <NotificationBell
                        token={token}
                        role={
                            usuario?.rol?.codigo
                        }
                    />
                    <Link
                        to={roleHomePath}
                        className="session-user"
                        aria-label={`Abrir el área de ${roleDisplayName}`}
                    >
                        <FaUserCircle />

                        <div>
                            <strong>
                                {usuario.nombreCompleto ??
                                    `${usuario.nombres} ${usuario.apellidos}`}
                            </strong>

                            <span>
                                {usuario.rol.nombre}
                            </span>
                        </div>
                    </Link>

                    <Link
                        to={roleHomePath}
                        className="session-home-link"
                    >
                        <FaHome />
                        <span>Mi área</span>
                    </Link>

                    <button
                        type="button"
                        className="session-logout-button"
                        onClick={handleLogout}
                    >
                        <FaSignOutAlt />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </div>
        </header>
    );
}

export default SessionHeader;
