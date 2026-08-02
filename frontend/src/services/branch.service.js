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

export async function listBranchesRequest(
    token,
    {
        search = "",
        estado = "TODOS",
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
        "estado",
        estado
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
            `/branches?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getBranchByIdRequest(
    token,
    branchId,
    signal
) {
    const response =
        await apiRequest(
            `/branches/${branchId}`,
            {
                token,
                signal
            }
        );

    return response.data.sucursal;
}

export function createBranchRequest(
    token,
    data
) {
    return apiRequest(
        "/branches",
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export function updateBranchRequest(
    token,
    branchId,
    data
) {
    return apiRequest(
        `/branches/${branchId}`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}

export function updateBranchStatusRequest(
    token,
    branchId,
    estado
) {
    return apiRequest(
        `/branches/${branchId}/status`,
        {
            method: "PATCH",
            token,
            body: {
                estado
            }
        }
    );
}

export function createZoneRequest(
    token,
    branchId,
    data
) {
    return apiRequest(
        `/branches/${branchId}/zones`,
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export function updateZoneRequest(
    token,
    branchId,
    zoneId,
    data
) {
    return apiRequest(
        `/branches/${branchId}/zones/${zoneId}`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}

export function updateZoneStatusRequest(
    token,
    branchId,
    zoneId,
    estado
) {
    return apiRequest(
        `/branches/${branchId}/zones/${zoneId}/status`,
        {
            method: "PATCH",
            token,
            body: {
                estado
            }
        }
    );
}