import {
    FaCalendarAlt,
    FaClock,
    FaMapMarkerAlt,
    FaUsers
} from "react-icons/fa";

import {
    formatDate,
    formatLabel,
    formatMoney
} from "./reservation.utils";

function ReservationCard({
    reservation,
    onOpen
}) {
    return (
        <article className="client-reservation-card">
            <header>
                <div>
                    <span className="client-reservation-code">
                        {reservation.codigo}
                    </span>
                    <h3>
                        {reservation.nombreEvento ??
                            formatLabel(
                                reservation.tipoReserva
                            )}
                    </h3>
                </div>

                <span
                    className={`client-status-badge status-${reservation.estado.toLowerCase()}`}
                >
                    {formatLabel(reservation.estado)}
                </span>
            </header>

            <dl className="client-reservation-facts">
                <div>
                    <dt>
                        <FaCalendarAlt /> Fecha
                    </dt>
                    <dd>
                        {formatDate(
                            reservation.fechaReserva
                        )}
                    </dd>
                </div>
                <div>
                    <dt>
                        <FaClock /> Horario
                    </dt>
                    <dd>
                        {reservation.horaReserva} · {reservation.duracionMinutos} min
                    </dd>
                </div>
                <div>
                    <dt>
                        <FaMapMarkerAlt /> Lugar
                    </dt>
                    <dd>
                        {reservation.sucursal.nombre} · {reservation.zona.nombre}
                    </dd>
                </div>
                <div>
                    <dt>
                        <FaUsers /> Asistentes
                    </dt>
                    <dd>
                        {reservation.cantidadPersonas} personas
                    </dd>
                </div>
            </dl>

            <footer>
                <div>
                    <small>Saldo estimado</small>
                    <strong>
                        {formatMoney(
                            reservation.saldoEstimado
                        )}
                    </strong>
                </div>

                <button
                    type="button"
                    className="client-button ghost"
                    onClick={() =>
                        onOpen(reservation.id)
                    }
                >
                    Ver detalle
                </button>
            </footer>
        </article>
    );
}

export default ReservationCard;
