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

export async function getCommandOptionsRequest(
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
            `/commands/options${
                query ? `?${query}` : ""
            }`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function listCommandsRequest(
    token,
    {
        search = "",
        sucursalId = "",
        destino = "TODOS",
        estado = "ACTIVAS",
        prioridad = "TODAS",
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
        "destino",
        destino
    );

    addParameter(
        params,
        "estado",
        estado
    );

    addParameter(
        params,
        "prioridad",
        prioridad
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
            `/commands?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getCommandByIdRequest(
    token,
    commandId,
    signal
) {
    const response =
        await apiRequest(
            `/commands/${commandId}`,
            {
                token,
                signal
            }
        );

    return response.data.comanda;
}

export function startCommandRequest(
    token,
    commandId
) {
    return apiRequest(
        `/commands/${commandId}/start`,
        {
            method: "PATCH",
            token,
            body: {}
        }
    );
}

export function completeCommandRequest(
    token,
    commandId
) {
    return apiRequest(
        `/commands/${commandId}/complete`,
        {
            method: "PATCH",
            token,
            body: {}
        }
    );
}