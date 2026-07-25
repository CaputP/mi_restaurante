import "./footer.css";
// Importamos el logo
import logo from "../../assets/images/logo.png";
// Importamos los iconos de react-icons
import { FaMapMarkerAlt, FaPhoneAlt, FaClock, FaWhatsapp, FaGithub } from "react-icons/fa";

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-content">
                    
                    {/* Columna 1: Logo y Descripción */}
                    <div className="footer-column brand-column">
                        <img src={logo} alt="Logo El Vallecito de Chocco" className="footer-logo" />
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
                        
                        <div className="contact-item">
                            <FaMapMarkerAlt className="footer-icon" />
                            <div>
                                <strong>Dirección</strong>
                                <p>Chocco, Santiago - Cusco</p>
                            </div>
                        </div>

                        <div className="contact-item">
                            <FaPhoneAlt className="footer-icon" />
                            <div>
                                <strong>Teléfono</strong>
                                <p>+51 944 744 356</p>
                            </div>
                        </div>

                        <div className="contact-item">
                            <FaClock className="footer-icon" />
                            <div>
                                <strong>Horario</strong>
                                <p>Domingos: 11:00 AM - 6:00 PM</p>
                            </div>
                        </div>

                        <div className="contact-item">
                            <FaWhatsapp className="footer-icon" />
                            <div>
                                <strong>WhatsApp</strong>
                                <p>+51 944 744 356</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Parte Inferior */}
            <div className="footer-bottom">
                <div className="footer-bottom-container">
                    <p>© 2026 El Vallecito de Chocco. Todos los derechos reservados.</p>
                    <p>Desarrollado por <strong>CaputDEV</strong></p>
                    <a href="https://github.com/CaputP" target="_blank" rel="noopener noreferrer" className="github-link">
                        <FaGithub /> GitHub
                    </a>
                </div>
            </div>
        </footer>
    );
}

export default Footer;