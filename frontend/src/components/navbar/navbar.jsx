import { useEffect, useState } from "react";
import {
    FaBars,
    FaSignOutAlt,
    FaTimes,
    FaUserCircle
} from "react-icons/fa";
import {
    Link,
    useNavigate
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/images/logo.png";
import "./navbar.css";

function Navbar({ titulo }) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    
    // NUEVO: Estado para saber si el usuario hizo scroll hacia abajo
    const [scrolled, setScrolled] = useState(false);

    const navigate = useNavigate();

    const {
        usuario,
        isAuthenticated,
        logout
    } = useAuth();

    const toggleMenu = () => {
        setMenuAbierto(!menuAbierto);
    };

    function handleLogout() {
        logout();
        setMenuAbierto(false);

        navigate("/", {
            replace: true
        });
    }

    // NUEVO: Efecto para detectar el movimiento del scroll
    useEffect(() => {
        const handleScroll = () => {
            // Si el scroll baja más de 50px, ponemos el estado en true
            if (window.scrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        
        // Limpiamos el evento para optimizar rendimiento cuando el componente se desmonte
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    const menu = [
        {
            nombre: "Inicio",
            enlace: "#inicio",
            tipo: "scroll"
        },
        {
            nombre: "Menu",
            enlace: "#platos",
            tipo: "scroll"
        },
        {
            nombre: "Eventos",
            enlace: "#eventos",
            tipo: "scroll"
        },
        {
            nombre: "Nosotros",
            enlace: "#historia",
            tipo: "scroll"
        },
        {
            nombre: "Reservas",
            enlace: "/reservations",
            tipo: "ruta"
        },
        {
            nombre: "Contacto",
            enlace: "#ubicacion",
            tipo: "scroll"
        },
    ];

    return (
        /* 2. MODIFICADO: Añadimos dinámicamente la clase 'scrolled' si el estado es true */
        <nav className={`navbar ${scrolled ? "scrolled" : ""}`}> 
            <a
            href="#inicio"
            className="logo"
            aria-label="Ir al inicio"
            onClick={() => setMenuAbierto(false)}
            >
            <img src={logo} alt="Logo de {titulo}" />
            <h2>{titulo}</h2>
            </a>
            <button className="menu-toggle" onClick={toggleMenu} aria-label="Abrir menú">
                {menuAbierto ? <FaTimes /> : <FaBars />}
            </button >

                <ul className={`nav-links ${menuAbierto ? "activo" : ""}`}>
                {menu.map((opcion) => (
                    <li key={opcion.nombre}>
                    {opcion.tipo === "ruta" ? (
                        <Link to={opcion.enlace} onClick={() => setMenuAbierto(false)}>
                        {opcion.nombre}
                        </Link>
                    ) : (
                        <a href={opcion.enlace} onClick={() => setMenuAbierto(false)}>
                        {opcion.nombre}
                        </a>
                    )}
                    </li>
                ))}

                {isAuthenticated ? (
                    <>
                        <li className="nav-user-item">
                            <Link
                                to={
                                    usuario.rol.codigo ===
                                        "ADMINISTRADOR_GENERAL" ||
                                    usuario.rol.codigo ===
                                        "ADMINISTRADOR_SUCURSAL"
                                        ? "/admin"
                                        : "/reservations"
                                }
                                onClick={() =>
                                    setMenuAbierto(false)
                                }
                            >
                                <FaUserCircle />
                                <span>
                                    {usuario.nombres}
                                </span>
                            </Link>
                        </li>

                        <li>
                            <button
                                type="button"
                                className="nav-logout-button"
                                onClick={handleLogout}
                            >
                                <FaSignOutAlt />
                                <span>Cerrar sesión</span>
                            </button>
                        </li>
                    </>
                ) : (
                    <li>
                        <Link
                            to="/login"
                            onClick={() =>
                                setMenuAbierto(false)
                            }
                        >
                            Iniciar sesión
                        </Link>
                    </li>
                )}

                </ul>
        </nav>
    );
}

export default Navbar;