import "./dishCard.css";
import { Link } from "react-router-dom";

function DishCard ({plato}){
    return(
        <div className="dish-card">
            <div className="dish-image">
                <img
                    src={plato.imagen}
                    alt={plato.nombre}
                    loading="lazy"
                    decoding="async"
                />
            </div>
            
            <div className="dish-content">
                <h3>{plato.nombre}</h3>
                <p>{plato.descripcion}</p>
                <p className="price">{plato.precio}</p>
                <Link
                    className="dish-action"
                    to="/reservations"
                    aria-label={`Reservar después de ver ${plato.nombre}`}
                >
                    Ver más
                </Link>
            </div>

        </div>
    )
}

export default DishCard;
