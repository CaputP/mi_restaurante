import {
    FaCheckCircle,
    FaStar
} from "react-icons/fa";
import "./testimonialCard.css";

function TestimonialCard({ testimonio }) {
    const initial =
        testimonio.nombre?.trim().charAt(0).toUpperCase() || "C";

    return (
        <article className="testimonial-card">
            <div className="testimonial-image">
                <span aria-hidden="true">{initial}</span>
            </div>

            <div className="testimonial-content">
                <div
                    className="stars"
                    aria-label={`${testimonio.calificacion} de 5 estrellas`}
                >
                    {[1, 2, 3, 4, 5].map((star) => (
                        <FaStar
                            key={star}
                            className={star <= testimonio.calificacion ? "filled" : ""}
                            aria-hidden="true"
                        />
                    ))}
                </div>

                <h3>{testimonio.nombre}</h3>
                <p className="comment">{testimonio.comentario}</p>

                <p className="testimonial-meta">
                    <span><FaCheckCircle /> Compra verificada</span>
                    <time dateTime={testimonio.fecha}>
                        {new Date(testimonio.fecha).toLocaleDateString(
                            "es-PE",
                            {
                                month: "short",
                                year: "numeric"
                            }
                        )}
                    </time>
                </p>
            </div>
        </article>
    );
}

export default TestimonialCard;
