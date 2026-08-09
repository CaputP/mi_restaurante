import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaChevronLeft,
    FaChevronRight,
    FaSyncAlt
} from "react-icons/fa";

import { useAuth } from "../../../context/AuthContext";
import { listReservationsRequest } from "../../../services/reservation.service";

const WEEKDAYS = [
    "Dom",
    "Lun",
    "Mar",
    "Mié",
    "Jue",
    "Vie",
    "Sáb"
];

function dateText(date) {
    return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

function createMonth(value = new Date()) {
    return new Date(
        Date.UTC(
            value.getUTCFullYear(),
            value.getUTCMonth(),
            1
        )
    );
}

function formatStatus(value) {
    return value
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(
            /(^|\s)\S/g,
            (letter) => letter.toUpperCase()
        );
}

function ReservationCalendar({
    branchId,
    onOpenReservation
}) {
    const { token } = useAuth();
    const [month, setMonth] =
        useState(() => createMonth());
    const [reservations, setReservations] =
        useState([]);
    const [isLoading, setIsLoading] =
        useState(true);
    const [error, setError] =
        useState("");

    const monthEnd = useMemo(
        () =>
            new Date(
                Date.UTC(
                    month.getUTCFullYear(),
                    month.getUTCMonth() + 1,
                    0
                )
            ),
        [month]
    );

    useEffect(() => {
        const controller = new AbortController();

        async function loadMonth() {
            try {
                const first =
                    await listReservationsRequest(
                        token,
                        {
                            sucursalId: branchId,
                            fechaDesde: dateText(month),
                            fechaHasta: dateText(monthEnd),
                            page: 1,
                            limit: 100,
                            signal: controller.signal
                        }
                    );

                const remainingPages =
                    Array.from(
                        {
                            length: Math.max(
                                0,
                                first.pagination.totalPages - 1
                            )
                        },
                        (_, index) => index + 2
                    );
                const remaining =
                    await Promise.all(
                        remainingPages.map((page) =>
                            listReservationsRequest(
                                token,
                                {
                                    sucursalId: branchId,
                                    fechaDesde: dateText(month),
                                    fechaHasta: dateText(monthEnd),
                                    page,
                                    limit: 100,
                                    signal: controller.signal
                                }
                            )
                        )
                    );

                setReservations([
                    ...first.reservas,
                    ...remaining.flatMap(
                        (page) => page.reservas
                    )
                ]);
                setError("");
            } catch (requestError) {
                if (requestError?.name !== "AbortError") {
                    setError(
                        requestError?.message ??
                            "No se pudo cargar el calendario."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadMonth();
        return () => controller.abort();
    }, [
        branchId,
        month,
        monthEnd,
        token
    ]);

    const calendarStart =
        addDays(
            month,
            -month.getUTCDay()
        );
    const days = Array.from(
        { length: 42 },
        (_, index) =>
            addDays(calendarStart, index)
    );
    const reservationsByDate =
        useMemo(() => {
            const grouped = new Map();

            reservations.forEach((reservation) => {
                const group =
                    grouped.get(
                        reservation.fechaReserva
                    ) ?? [];
                group.push(reservation);
                grouped.set(
                    reservation.fechaReserva,
                    group
                );
            });

            grouped.forEach((items) =>
                items.sort((first, second) =>
                    first.horaReserva.localeCompare(
                        second.horaReserva
                    )
                )
            );

            return grouped;
        }, [reservations]);

    function changeMonth(offset) {
        setIsLoading(true);
        setMonth(
            new Date(
                Date.UTC(
                    month.getUTCFullYear(),
                    month.getUTCMonth() + offset,
                    1
                )
            )
        );
    }

    return (
        <section className="reservation-calendar-card">
            <header>
                <div>
                    <span className="admin-eyebrow">
                        CALENDARIO OPERATIVO
                    </span>
                    <h3>
                        {new Intl.DateTimeFormat(
                            "es-PE",
                            {
                                timeZone: "UTC",
                                month: "long",
                                year: "numeric"
                            }
                        ).format(month)}
                    </h3>
                </div>
                <div>
                    <button
                        type="button"
                        onClick={() => changeMonth(-1)}
                        aria-label="Mes anterior"
                    >
                        <FaChevronLeft />
                    </button>
                    <button
                        type="button"
                        onClick={() => changeMonth(1)}
                        aria-label="Mes siguiente"
                    >
                        <FaChevronRight />
                    </button>
                </div>
            </header>

            {error && (
                <div className="reservation-calendar-error" role="alert">
                    {error}
                </div>
            )}

            <div className="reservation-calendar-scroll">
                <div className="reservation-calendar-grid weekdays">
                    {WEEKDAYS.map((day) => (
                        <strong key={day}>{day}</strong>
                    ))}
                </div>
                <div className="reservation-calendar-grid days">
                    {days.map((day) => {
                        const key = dateText(day);
                        const items =
                            reservationsByDate.get(key) ?? [];
                        const outside =
                            day.getUTCMonth() !==
                            month.getUTCMonth();

                        return (
                            <article
                                key={key}
                                className={outside ? "outside" : ""}
                            >
                                <span className="reservation-calendar-day">
                                    {day.getUTCDate()}
                                </span>
                                <div>
                                    {items.slice(0, 4).map((reservation) => (
                                        <button
                                            type="button"
                                            key={reservation.id}
                                            className={`calendar-reservation status-${reservation.estado.toLowerCase()}`}
                                            title={`${reservation.codigo} · ${formatStatus(reservation.estado)}`}
                                            onClick={() =>
                                                onOpenReservation(
                                                    reservation.id
                                                )
                                            }
                                        >
                                            <strong>{reservation.horaReserva}</strong>
                                            <span>
                                                {reservation.zona.nombre} · {reservation.cliente.nombreCompleto}
                                            </span>
                                        </button>
                                    ))}
                                    {items.length > 4 && (
                                        <small>
                                            +{items.length - 4} más
                                        </small>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>

            {isLoading && (
                <div className="reservation-calendar-loading" aria-live="polite">
                    <FaSyncAlt /> Actualizando calendario...
                </div>
            )}
        </section>
    );
}

export default ReservationCalendar;
