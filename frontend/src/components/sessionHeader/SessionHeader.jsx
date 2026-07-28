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

import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/images/logo.png";
import "./SessionHeader.css";

function SessionHeader({
    title,
    onMenuToggle
}) {
    const navigate = useNavigate();

    const {
        usuario,
        logout
    } = useAuth();

    function handleLogout() {
        logout();

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

                <div className="session-header-brand">
                    <img
                        src={logo}
                        alt="El Vallecito de Chocco"
                    />

                    <div>
                        <h1>{title}</h1>
                        <p>El Vallecito de Chocco</p>
                    </div>
                </div>
            </div>

            <div className="session-header-actions">
                <div className="session-user">
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
                </div>

                <Link
                    to="/"
                    className="session-home-link"
                >
                    <FaHome />
                    <span>Inicio</span>
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
        </header>
    );
}

export default SessionHeader;