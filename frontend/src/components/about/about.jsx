// =====================
// IMPORTAMOS EL CSS
//======================

import "./about.css";
import historiaImagen from "../../assets/images/about/about.jpg"

// =====================
// COMPONENTE ABOUT
//======================    

function About({titulo}){
    return(
        <section id="historia" className="about">
            <div className="about-container">
                <div className="about-image">   
                    <img src= {historiaImagen}
                        alt="Nuestra Historia" 
                    />
                </div>
                <div className="about-content">
                    <h2>
                        {titulo}
                    </h2>
                    <p>
                        El Vallecito de Chocco nació en la Comunidad Campesina de Chocco, Cusco, con el propósito 
                        de preservar y celebrar las tradiciones culinarias de la región. Este 
                        espacio campestre ofrece una propuesta rústica, donde platos emblemáticos 
                        como el cuy al horno y el chairo se preparan con el auténtico sabor de antaño.
                         
                    </p>
                    <p>
                        Un refugio de paz donde el aire puro y el verdor del paisaje cusqueño complementan 
                        perfectamente la experiencia.
                        Tmbien un punto de encuentro preferido de las familias que buscan escapar del 
                        bullicio de la ciudad. Gracias al cariño de sus visitantes, 
                        
                    </p>

                    <button>
                    Conoce mas
                </button>
                </div>
            </div>    
        </section>
    )
}


export default About;