import {
    apiRequest
} from "./api";

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

export async function getAuditOptionsRequest(
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
            `/audit/options${
                query
                    ? `?${query}`
                    : ""
            }`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function listAuditsRequest(
    token,
    {
        search = "",
        sucursalId = "",
        usuarioId = "",
        modulo = "",
        accion = "",
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
        "usuarioId",
        usuarioId
    );

    addParameter(
        params,
        "modulo",
        modulo
    );

    addParameter(
        params,
        "accion",
        accion
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
            `/audit?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getAuditByIdRequest(
    token,
    auditId,
    signal
) {
    const response =
        await apiRequest(
            `/audit/${auditId}`,
            {
                token,
                signal
            }
        );

    return response.data.auditoria;
}