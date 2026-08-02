import {
    apiRequest
} from "./api";

function buildQueryString(
    params = {}
) {
    const query =
        new URLSearchParams();

    Object.entries(
        params
    ).forEach(
        ([key, value]) => {
            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {
                query.set(
                    key,
                    String(value)
                );
            }
        }
    );

    const result =
        query.toString();

    return result
        ? `?${result}`
        : "";
}

export async function getLoyaltyOptionsRequest(
    token,
    params = {},
    signal
) {
    const query =
        buildQueryString(
            params
        );

    const response =
        await apiRequest(
            `/loyalty/options${query}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function listLoyaltyProgramsRequest(
    token,
    params = {},
    signal
) {
    const query =
        buildQueryString(
            params
        );

    const response =
        await apiRequest(
            `/loyalty/programs${query}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getLoyaltyProgramRequest(
    token,
    programId,
    signal
) {
    const response =
        await apiRequest(
            `/loyalty/programs/${programId}`,
            {
                token,
                signal
            }
        );

    return response.data.programa;
}

export async function createLoyaltyProgramRequest(
    token,
    data
) {
    const response =
        await apiRequest(
            "/loyalty/programs",
            {
                method: "POST",
                token,
                body: data
            }
        );

    return response.data.programa;
}

export async function updateLoyaltyProgramRequest(
    token,
    programId,
    data
) {
    const response =
        await apiRequest(
            `/loyalty/programs/${programId}`,
            {
                method: "PATCH",
                token,
                body: data
            }
        );

    return response.data.programa;
}

export async function updateLoyaltyProgramStatusRequest(
    token,
    programId,
    activo
) {
    const response =
        await apiRequest(
            `/loyalty/programs/${programId}/status`,
            {
                method: "PATCH",
                token,
                body: {
                    activo
                }
            }
        );

    return response.data.programa;
}

export async function listLoyaltyCustomersRequest(
    token,
    params = {},
    signal
) {
    const query =
        buildQueryString(
            params
        );

    const response =
        await apiRequest(
            `/loyalty/customers${query}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getLoyaltyCustomerRequest(
    token,
    customerId,
    params = {},
    signal
) {
    const query =
        buildQueryString(
            params
        );

    const response =
        await apiRequest(
            `/loyalty/customers/${customerId}${query}`,
            {
                token,
                signal
            }
        );

    return response.data.cliente;
}