import { useState, useEffect } from "react"; // 1. MODIFICADO: Importamos useEffect
import { FaBars, FaTimes } from "react-icons/fa";
import {Link} from "react-router-dom"
import "./navbar.css";
import logo from "../../assets/images/logo.png";

function Navbar({ titulo }) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    
    // NUEVO: Estado para saber si el usuario hizo scroll hacia abajo
    const [scrolled, setScrolled] = useState(false);

    const toggleMenu = () => {
        setMenuAbierto(!menuAbierto);
    };

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
        {
            nombre: "Iniciar Sesion",
            enlace: "/login",
            tipo: "ruta"
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
                </ul>
        </nav>
    );
}

export default Navbar;