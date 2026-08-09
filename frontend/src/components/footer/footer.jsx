import "./footer.css";
// Importamos el logo
import logo from "../../assets/images/logo.webp";
// Importamos los iconos de react-icons
import { FaMapMarkerAlt, FaPhoneAlt, FaClock, FaWhatsapp, FaGithub } from "react-icons/fa";
import { Link } from "react-router-dom";

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-content">
                    
                    {/* Columna 1: Logo y Descripción */}
                    <div className="footer-column brand-column">
                        <a
                            href="#inicio"
                            aria-label="Volver al inicio"
                        >
                            <img src={logo} alt="Logo El Vallecito de Chocco" className="footer-logo" />
                        </a>
                        <h2>EL VALLECITO DE CHOCCO</h2>
                        <p>Quinta campestre donde la tradición y la naturaleza se unen para ofrecer una experiencia gastronómica única.</p>
                    </div>

                    {/* Columna 2: Enlaces Rápidos */}
                    <div className="footer-column links-column">
                        <h3>Enlaces</h3>
                        <a href="#inicio">Inicio</a>
                        <a href="#historia">Nuestra Historia</a>
                        <a href="#galeria">Galería</a>
                        <a href="#eventos">Eventos</a>
                        <a href="#ubicacion">Ubicación</a>
                    </div>

                    {/* Columna 3: Contacto con Iconos */}
                    <div className="footer-column contact-column">
                        <h3>Contacto</h3>
                        
                        <a
                            className="contact-item"
                            href="https://www.google.com/maps/search/?api=1&query=El+Vallecito+de+Chocco+Cusco"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <FaMapMarkerAlt className="footer-icon" />
                            <div>
                                <strong>Dirección</strong>
                                <p>Chocco, Santiago - Cusco</p>
                            </div>
                        </a>

                        <a
                            className="contact-item"
                            href="tel:+51994744356"
                        >
                            <FaPhoneAlt className="footer-icon" />
                            <div>
                                <strong>Teléfono</strong>
                                <p>+51 994 744 356</p>
                            </div>
                        </a>

                        <div className="contact-item">
                            <FaClock className="footer-icon" />
                            <div>
                                <strong>Horario</strong>
                                <p>Domingos: 11:00 AM - 6:00 PM</p>
                            </div>
                        </div>

                        <a
                            className="contact-item"
                            href="https://wa.me/51994744356"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <FaWhatsapp className="footer-icon" />
                            <div>
                                <strong>WhatsApp</strong>
                                <p>+51 994 744 356</p>
                            </div>
                        </a>
                    </div>

                    <div className="footer-column legal-column">
                        <h3>Información legal</h3>
                        <Link to="/legal/terminos">Términos y Condiciones</Link>
                        <Link to="/legal/privacidad">Política de Privacidad</Link>
                        <Link to="/legal/cookies">Política de Cookies</Link>
                        <Link to="/legal/reservas-cancelaciones">Reservas y cancelaciones</Link>
                        <Link className="complaint-book-link" to="/libro-de-reclamaciones">
                            Libro de Reclamaciones
                        </Link>
                    </div>
                </div>
            </div>

            {/* Parte Inferior */}
            <div className="footer-bottom">
                <div className="footer-bottom-container">
                    <p>© 2026 El Vallecito de Chocco. Todos los derechos reservados.</p>
                    <p>Desarrollado por <strong>CaputDEV</strong></p>
                    <button
                        type="button"
                        className="footer-cookie-settings"
                        onClick={() => globalThis.dispatchEvent(new Event("vallecito:open-cookie-settings"))}
                    >
                        Configurar cookies
                    </button>
                    <a href="https://github.com/CaputP" target="_blank" rel="noopener noreferrer" className="github-link">
                        <FaGithub /> GitHub
                    </a>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
