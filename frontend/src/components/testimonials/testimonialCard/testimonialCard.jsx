import "./testimonialCard.css";

function TestimonialCard ({testimonio}){
    return(
        <div className="testimonial-card">
            <div className="testimonial-image">
                <img src={testimonio.foto} alt={testimonio.nombre} />
            </div>
            
            <div className="testimonial-content">
                <p className="stars">{testimonio.calificacion}</p>
                <h3>{testimonio.nombre}</h3>
                <p className="comment">{testimonio.comentario}</p>
          
            </div>

        </div>
    )
}

export default TestimonialCard;