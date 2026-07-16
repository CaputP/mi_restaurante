import "./featuredDishes.css";
import featuredDishes from "../../data/featuredDishes";
import DishCard from "./dishCard/dishCard.jsx";

function FeaturedDishes({ titulo }) {
    return (
        <section className="featured-dishes">
            <div className="featured-dishes-container">
                <h2>{titulo}</h2>
                <div className="dishes-grid">
                    {
                        featuredDishes.map((plato) => (
                            <DishCard
                                key={plato.id}
                                plato={plato}
                            />
                        ))
                    }
                </div>
            </div>
        </section>
    );
}

export default FeaturedDishes;