import "./testimonials.css";
import testimonials from "../../data/testimonials.js";
import TestimonialCard from "./testimonialCard/testimonialCard.jsx";

function Testimonials({titulo}){
    return (
        <section className="testimonials">
            <div className="testimonials-container">
                <h2>{titulo}</h2>
                <div className="testimonials-grid">
                    {
                        testimonials.map((testimonio) => (
                            <TestimonialCard
                                key={testimonio.id}
                                testimonio={testimonio}
                            />
                        ))
                    }
                </div>    
            </div>        
        </section>
    );
}

export default Testimonials;