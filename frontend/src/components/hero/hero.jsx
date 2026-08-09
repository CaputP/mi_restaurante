// =========================
// IMPORTACIONES
// =========================

import "./hero.css";
import heroImage from "../../assets/images/hero/hero.webp";
import { Link } from "react-router-dom";
// =========================
// COMPONENTE HERO
// =========================

function Hero({titulo, subtitulo}) {
    return (
        <section id="inicio"
            className="hero"
            style={{
                backgroundImage: `url(${heroImage})`
            }}>
            <div className="hero-overlay">
                <div className="hero-content">
                    <h1>
                        {titulo}
                    </h1>
                    <p>
                        {subtitulo}
                    </p>

                    <div className="hero-buttons">
                        <a
                            className="btn-primary"
                            href="#platos"
                        >
                            Ver Carta
                        </a>

                        <Link
                            className="btn-secondary"
                            to="/reservations"
                        >
                            Reservar
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Hero;
