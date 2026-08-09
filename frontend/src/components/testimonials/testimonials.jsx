import {
    useEffect,
    useState
} from "react";
import {
    getPublicReviewsRequest
} from "../../services/review.service";
import TestimonialCard from "./testimonialCard/testimonialCard.jsx";
import "./testimonials.css";

function Testimonials({ titulo }) {
    const [data, setData] = useState({
        testimonios: [],
        resumen: {
            promedio: 0,
            total: 0
        }
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        async function loadTestimonials() {
            try {
                const result = await getPublicReviewsRequest(
                    6,
                    controller.signal
                );
                setData(result);
            } catch (error) {
                if (error?.name !== "AbortError") {
                    setData({
                        testimonios: [],
                        resumen: {
                            promedio: 0,
                            total: 0
                        }
                    });
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadTestimonials();
        return () => controller.abort();
    }, []);

    if (!isLoading && data.testimonios.length === 0) {
        return null;
    }

    return (
        <section className="testimonials" aria-busy={isLoading}>
            <div className="testimonials-container">
                <h2>{titulo}</h2>

                {!isLoading && (
                    <p className="testimonials-summary">
                        <strong>{data.resumen.promedio} de 5</strong>
                        <span>basado en {data.resumen.total} opinión(es) verificadas</span>
                    </p>
                )}

                <div className="testimonials-grid">
                    {isLoading
                        ? [1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="testimonial-skeleton"
                                aria-hidden="true"
                            />
                        ))
                        : data.testimonios.map((testimonio) => (
                            <TestimonialCard
                                key={testimonio.id}
                                testimonio={testimonio}
                            />
                        ))}
                </div>
            </div>
        </section>
    );
}

export default Testimonials;
