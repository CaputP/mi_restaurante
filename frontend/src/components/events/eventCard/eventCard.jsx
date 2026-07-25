import "./eventCard.css";

function EventCard ({evento}){
    return(
        <div className="event-card">
            <div className="event-image">
                <img src={evento.imagen} alt={evento.nombre} />
            </div>
            
            <div className="event-content">
                <h3>{evento.nombre}</h3>            
                <p>{evento.descripcion}</p>            
            </div>

        </div>
    )
}

export default EventCard;