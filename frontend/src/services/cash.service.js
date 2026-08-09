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

export async function getCashOptionsRequest(
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
            `/cash/options${
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

export async function getCurrentCashRequest(
    token,
    {
        sucursalId = "",
        vendedorId = "",
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

    addParameter(
        params,
        "vendedorId",
        vendedorId
    );

    const query =
        params.toString();

    const response =
        await apiRequest(
            `/cash/current${
                query
                    ? `?${query}`
                    : ""
            }`,
            {
                token,
                signal
            }
        );

    return response.data.caja;
}

export async function listCashRegistersRequest(
    token,
    {
        search = "",
        sucursalId = "",
        vendedorId = "",
        estado = "TODOS",
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
        "vendedorId",
        vendedorId
    );

    addParameter(
        params,
        "estado",
        estado
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
            `/cash?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getCashRegisterByIdRequest(
    token,
    cashId,
    signal
) {
    const response =
        await apiRequest(
            `/cash/${cashId}`,
            {
                token,
                signal
            }
        );

    return response.data.caja;
}

export function openCashRegisterRequest(
    token,
    data
) {
    return apiRequest(
        "/cash/open",
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export function closeCashRegisterRequest(
    token,
    cashId,
    data
) {
    return apiRequest(
        `/cash/${cashId}/close`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}

export function reopenCashRegisterRequest(
    token,
    cashId,
    data
) {
    return apiRequest(
        `/cash/${cashId}/reopen`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}
