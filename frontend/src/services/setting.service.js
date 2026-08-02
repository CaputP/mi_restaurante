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

export async function getSettingOptionsRequest(
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
            `/settings/options${
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

export async function listSettingsRequest(
    token,
    {
        search = "",
        sucursalId = "",
        alcance = "TODOS",
        tipoDato = "",
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
        "alcance",
        alcance
    );

    addParameter(
        params,
        "tipoDato",
        tipoDato
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
            `/settings?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getSettingByIdRequest(
    token,
    settingId,
    signal
) {
    const response =
        await apiRequest(
            `/settings/${settingId}`,
            {
                token,
                signal
            }
        );

    return response.data.configuracion;
}

export function createSettingRequest(
    token,
    data
) {
    return apiRequest(
        "/settings",
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export function updateSettingRequest(
    token,
    settingId,
    data
) {
    return apiRequest(
        `/settings/${settingId}`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}

export function updateSettingEditabilityRequest(
    token,
    settingId,
    editable
) {
    return apiRequest(
        `/settings/${settingId}/editability`,
        {
            method: "PATCH",
            token,
            body: {
                editable
            }
        }
    );
}

export async function listCorrelativesRequest(
    token,
    {
        sucursalId,
        signal
    }
) {
    const params =
        new URLSearchParams();

    addParameter(
        params,
        "sucursalId",
        sucursalId
    );

    const response =
        await apiRequest(
            `/settings/correlatives?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export function updateCorrelativeRequest(
    token,
    documentType,
    data
) {
    return apiRequest(
        `/settings/correlatives/${documentType}`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}