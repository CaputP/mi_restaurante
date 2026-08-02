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

export async function getSaleOptionsRequest(
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
            `/sales/options${
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

export async function listSalesRequest(
    token,
    {
        search = "",
        sucursalId = "",
        cajaId = "",
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
        "cajaId",
        cajaId
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
            `/sales?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getSaleByIdRequest(
    token,
    saleId,
    signal
) {
    const response =
        await apiRequest(
            `/sales/${saleId}`,
            {
                token,
                signal
            }
        );

    return response.data.venta;
}

export function createSaleRequest(
    token,
    data
) {
    return apiRequest(
        "/sales",
        {
            method: "POST",
            token,
            body: data
        }
    );
}