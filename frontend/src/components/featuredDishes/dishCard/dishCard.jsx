import "./dishCard.css";

function DishCard ({plato}){
    return(
        <div className="dish-card">
            <div className="dish-image">
                <img src={plato.imagen} alt={plato.nombre} />
            </div>
            
            <div className="dish-content">
                <h3>{plato.nombre}</h3>
                <p>{plato.descripcion}</p>
                <p className="price">{plato.precio}</p>
                <button>Ver mas</button>                
            </div>

        </div>
    )
}

export default DishCard;