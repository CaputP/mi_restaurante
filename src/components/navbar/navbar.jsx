import { useState, useEffect } from "react"; // 1. MODIFICADO: Importamos useEffect
import { FaBars, FaTimes } from "react-icons/fa";
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
        "Inicio",
        "Menu",
        "Eventos",
        "Nosotros",
        "Reservas",
        "Contacto",
        "Iniciar Sesion"
    ];

    return (
        /* 2. MODIFICADO: Añadimos dinámicamente la clase 'scrolled' si el estado es true */
        <nav className={`navbar ${scrolled ? "scrolled" : ""}`}> 
            <div className="logo">
                <img 
                    src={logo}
                    alt="logo del restaurante" 
                />
                <h2>{titulo}</h2>
            </div>

            <button className="menu-toggle" onClick={toggleMenu} aria-label="Abrir menú">
                {menuAbierto ? <FaTimes /> : <FaBars />}
            </button>

            <ul className={`nav-links ${menuAbierto ? "activo" : ""}`}>
                {
                    menu.map((opcion, indice) => (
                        <li key={indice} onClick={toggleMenu}>
                            <a href={`#${opcion.toLowerCase()}`}>
                                {opcion}
                            </a>
                        </li>
                    ))
                }
            </ul>
        </nav>
    );
}

export default Navbar;