// =====================
// IMPORTAMOS EL CSS
//======================

import "./parallax.css";
import parallax from "../../assets/images/parallax/parallax.jpg"
// =====================
// COMPONENTE PARALLAX
//======================

function Parallax (){
    return(
        <section className="parallax" 
        style={{
                backgroundImage: `url(${parallax})`
        }}>
            <div className="parallax-overlay">
                <h2>
                    "Más que un restaurante, una experiencia gastronomica."
                </h2>
                <p>
                    Disfruta la tradicion cusqueña en un ambiente natural.
                </p>
            </div>
        </section>
    )
}

export default Parallax;