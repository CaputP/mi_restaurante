import "./location.css";
// Importamos los iconos que necesitamos
import { FaMapMarkerAlt, FaPhoneAlt, FaRegClock, FaWhatsapp } from "react-icons/fa";

function Location({ titulo }) {
    return (
        <section id="ubicacion" className="location">
            <div className="location-container">
                <h2>{titulo}</h2>
                <div className="location-content">
                    
                    {/* Contenedor del Mapa */}
                    <div className="location-map">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3879.4447477174624!2d-71.9723223!3d-13.5385611!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x916dd5a2d727e6c9%3A0x463d5da23b19eb59!2sEL%20VALLECITO%20DE%20CHOCCO!5e0!3m2!1ses!2spe!4v1710000000000!5m2!1ses!2spe"
                            width="100%"
                            height="450"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                        ></iframe>
                    </div>

                    {/* Contenedor de Información con React Icons */}
                    <div className="location-info">
                        
                        <div className="info-item">
                            <div className="info-header">
                                <FaMapMarkerAlt className="info-icon" />
                                <h3>Dirección</h3>
                            </div>
                            <p>Cc. Chocco, Santiago 08000</p>
                            <p>Cusco, Perú</p>
                        </div>

                        <div className="info-item">
                            <div className="info-header">
                                <FaPhoneAlt className="info-icon" />
                                <h3>Teléfono</h3>
                            </div>
                            <p>+51 994 744 356</p>
                        </div>

                        <div className="info-item">
                            <div className="info-header">
                                <FaRegClock className="info-icon" />
                                <h3>Horario</h3>
                            </div>
                            <p>Domingos:</p>
                            <p>11:00 AM - 6:00 PM</p>
                        </div>

                        <div className="info-item">
                            <div className="info-header">
                                <FaWhatsapp className="info-icon whatsapp-color" />
                                <h3>WhatsApp</h3>
                            </div>
                            <p>+51 994 744 356</p>
                        </div>    

                    </div>
                </div>
            </div>
        </section>
    );
}

export default Location;