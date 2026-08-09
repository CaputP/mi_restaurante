import {
    apiDownload,
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

export async function getReportOptionsRequest(
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
            `/reports/options${
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

export async function getReportSummaryRequest(
    token,
    {
        sucursalId = "",
        fechaDesde = "",
        fechaHasta = "",
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
        "fechaDesde",
        fechaDesde
    );

    addParameter(
        params,
        "fechaHasta",
        fechaHasta
    );

    const query =
        params.toString();

    const response =
        await apiRequest(
            `/reports/summary${
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

export async function getReportDetailsRequest(
    token,
    {
        tipo,
        filtro = "",
        sucursalId = "",
        fechaDesde = "",
        fechaHasta = "",
        page = 1,
        limit = 25,
        signal
    }
) {
    const params =
        new URLSearchParams();

    addParameter(params, "tipo", tipo);
    addParameter(params, "filtro", filtro);
    addParameter(params, "sucursalId", sucursalId);
    addParameter(params, "fechaDesde", fechaDesde);
    addParameter(params, "fechaHasta", fechaHasta);
    addParameter(params, "page", page);
    addParameter(params, "limit", limit);

    const response =
        await apiRequest(
            `/reports/details?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function downloadReportRequest(
    token,
    format,
    {
        sucursalId = "",
        fechaDesde = "",
        fechaHasta = "",
        signal
    } = {}
) {
    const params = new URLSearchParams();

    addParameter(params, "sucursalId", sucursalId);
    addParameter(params, "fechaDesde", fechaDesde);
    addParameter(params, "fechaHasta", fechaHasta);

    return apiDownload(
        `/reports/export.${format}?${params.toString()}`,
        {
            token,
            signal
        }
    );
}
