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

export async function getPromotionOptionsRequest(
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
            `/promotions/options${query}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function listPromotionsRequest(
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
            `/promotions${query}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getPromotionRequest(
    token,
    promotionId,
    signal
) {
    const response =
        await apiRequest(
            `/promotions/${promotionId}`,
            {
                token,
                signal
            }
        );

    return response.data.promocion;
}

export async function createPromotionRequest(
    token,
    data
) {
    const response =
        await apiRequest(
            "/promotions",
            {
                method: "POST",
                token,
                body: data
            }
        );

    return response.data.promocion;
}

export async function updatePromotionRequest(
    token,
    promotionId,
    data
) {
    const response =
        await apiRequest(
            `/promotions/${promotionId}`,
            {
                method: "PATCH",
                token,
                body: data
            }
        );

    return response.data.promocion;
}

export async function updatePromotionStatusRequest(
    token,
    promotionId,
    estado
) {
    const response =
        await apiRequest(
            `/promotions/${promotionId}/status`,
            {
                method: "PATCH",
                token,
                body: {
                    estado
                }
            }
        );

    return response.data.promocion;
}

export async function previewAutomaticPromotionsRequest(
    token,
    pedidoId,
    signal
) {
    const response =
        await apiRequest(
            "/promotions/preview",
            {
                method: "POST",
                token,
                signal,
                body: {
                    pedidoId
                }
            }
        );

    return response.data;
}

export async function listAvailablePromotionsRequest(
    token,
    signal
) {
    const response =
        await apiRequest(
            "/promotions/available",
            {
                token,
                signal
            }
        );

    return response.data;
}
