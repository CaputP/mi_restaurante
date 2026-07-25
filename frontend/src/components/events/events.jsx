import "./events.css";
import events from "../../data/events.js";
import EventCard from "./eventCard/eventCard.jsx";

function Events({titulo}){
    return (
        <section id="eventos" className="events">
            <div className="events-container">
                <h2>{titulo}</h2>
                <div className="events-grid">
                    {
                        events.map((evento) => (
                            <EventCard
                                key={evento.id}
                                evento={evento}
                            />
                        ))
                    }
                </div>    
            </div>    
        </section>
    );
}

export default Events;