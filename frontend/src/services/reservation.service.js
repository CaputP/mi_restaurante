import { apiRequest } from "./api";

function addParameter(
    params,
    name,
    value
) {
    if (
        value !== undefined &&
        value !== null &&
        value !== ""
    ) {
        params.set(
            name,
            String(value)
        );
    }
}

export async function getReservationOptionsRequest(
    token,
    {
        sucursalId = "",
        signal
    } = {}
) {
    const params =
        new URLSearchParams();

    addParameter(
        params,
        "sucursalId",
        sucursalId
    );

    const query =
        params.toString();

    const response =
        await apiRequest(
            `/admin/reservations/options${
                query ? `?${query}` : ""
            }`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function checkReservationAvailabilityRequest(
    token,
    data,
    signal
) {
    const params =
        new URLSearchParams();

    addParameter(
        params,
        "sucursalId",
        data.sucursalId
    );

    addParameter(
        params,
        "zonaId",
        data.zonaId
    );

    addParameter(
        params,
        "fechaReserva",
        data.fechaReserva
    );

    addParameter(
        params,
        "horaReserva",
        data.horaReserva
    );

    addParameter(
        params,
        "duracionMinutos",
        data.duracionMinutos
    );

    addParameter(
        params,
        "cantidadPersonas",
        data.cantidadPersonas
    );

    const response =
        await apiRequest(
            `/admin/reservations/availability?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function listReservationsRequest(
    token,
    {
        search = "",
        sucursalId = "",
        estado = "TODOS",
        tipoReserva = "TODOS",
        fechaDesde = "",
        fechaHasta = "",
        page = 1,
        limit = 20,
        signal
    } = {}
) {
    const params =
        new URLSearchParams();

    addParameter(
        params,
        "search",
        search.trim()
    );

    addParameter(
        params,
        "sucursalId",
        sucursalId
    );

    addParameter(
        params,
        "estado",
        estado
    );

    addParameter(
        params,
        "tipoReserva",
        tipoReserva
    );

    addParameter(
        params,
        "fechaDesde",
        fechaDesde
    );

    addParameter(
        params,
        "fechaHasta",
        fechaHasta
    );

    addParameter(
        params,
        "page",
        page
    );

    addParameter(
        params,
        "limit",
        limit
    );

    const response =
        await apiRequest(
            `/admin/reservations?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getReservationByIdRequest(
    token,
    reservationId,
    signal
) {
    const response =
        await apiRequest(
            `/admin/reservations/${reservationId}`,
            {
                token,
                signal
            }
        );

    return response.data.reserva;
}

export function createReservationRequest(
    token,
    data
) {
    return apiRequest(
        "/admin/reservations",
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export function reviewReservationRequest(
    token,
    reservationId,
    data
) {
    return apiRequest(
        `/admin/reservations/${reservationId}/review`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}

export function approveReservationRequest(
    token,
    reservationId,
    data
) {
    return apiRequest(
        `/admin/reservations/${reservationId}/approve`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}

export function rejectReservationRequest(
    token,
    reservationId,
    data
) {
    return apiRequest(
        `/admin/reservations/${reservationId}/reject`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}

export function registerReservationPaymentRequest(
    token,
    reservationId,
    data
) {
    return apiRequest(
        `/admin/reservations/${reservationId}/payments`,
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export function confirmReservationPaymentRequest(
    token,
    reservationId,
    paymentId,
    data = {}
) {
    return apiRequest(
        `/admin/reservations/${reservationId}/payments/${paymentId}/confirm`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}

export function cancelReservationRequest(
    token,
    reservationId,
    data
) {
    return apiRequest(
        `/admin/reservations/${reservationId}/cancel`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}

export async function getClientReservationOptionsRequest(
    token,
    {
        sucursalId = "",
        signal
    } = {}
) {
    const params = new URLSearchParams();

    addParameter(
        params,
        "sucursalId",
        sucursalId
    );

    const query = params.toString();
    const response = await apiRequest(
        `/reservations/options${
            query ? `?${query}` : ""
        }`,
        {
            token,
            signal
        }
    );

    return response.data;
}

export async function checkClientReservationAvailabilityRequest(
    token,
    data,
    signal
) {
    const params = new URLSearchParams();

    [
        "sucursalId",
        "zonaId",
        "fechaReserva",
        "horaReserva",
        "duracionMinutos",
        "cantidadPersonas"
    ].forEach((field) => {
        addParameter(
            params,
            field,
            data[field]
        );
    });

    const response = await apiRequest(
        `/reservations/availability?${params.toString()}`,
        {
            token,
            signal
        }
    );

    return response.data;
}

export async function listClientReservationsRequest(
    token,
    {
        estado = "TODOS",
        page = 1,
        limit = 12,
        signal
    } = {}
) {
    const params = new URLSearchParams();

    addParameter(params, "estado", estado);
    addParameter(params, "page", page);
    addParameter(params, "limit", limit);

    const response = await apiRequest(
        `/reservations?${params.toString()}`,
        {
            token,
            signal
        }
    );

    return response.data;
}

export async function getClientReservationRequest(
    token,
    reservationId,
    signal
) {
    const response = await apiRequest(
        `/reservations/${reservationId}`,
        {
            token,
            signal
        }
    );

    return response.data.reserva;
}

export function createClientReservationRequest(
    token,
    data
) {
    return apiRequest(
        "/reservations",
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export function registerClientReservationPaymentRequest(
    token,
    reservationId,
    data
) {
    return apiRequest(
        `/reservations/${reservationId}/payments`,
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export function cancelClientReservationRequest(
    token,
    reservationId,
    motivo
) {
    return apiRequest(
        `/reservations/${reservationId}/cancel`,
        {
            method: "PATCH",
            token,
            body: {
                motivo
            }
        }
    );
}

export function rescheduleClientReservationRequest(
    token,
    reservationId,
    data
) {
    return apiRequest(
        `/reservations/${reservationId}/reschedule`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}
