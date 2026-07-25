// =========================
// IMPORTACIONES
// =========================

import "./hero.css";
import heroImage from "../../assets/images/hero/hero.jpg";
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
                        <button className="btn-primary">
                            Ver Carta
                        </button>

                        <button className="btn-secondary">
                            Rerservar
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Hero;