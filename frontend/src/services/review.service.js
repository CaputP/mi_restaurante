import {
    apiRequest
} from "./api";

export async function getPublicReviewsRequest(
    limit = 6,
    signal
) {
    const response = await apiRequest(
        `/reviews/public?limit=${encodeURIComponent(limit)}`,
        { signal }
    );

    return response.data;
}

export async function listClientReviewableSalesRequest(
    token,
    {
        page = 1,
        limit = 12,
        signal
    } = {}
) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit)
    });
    const response = await apiRequest(
        `/reviews/my-sales?${params.toString()}`,
        {
            token,
            signal
        }
    );

    return response.data;
}

export async function createReviewRequest(
    token,
    data
) {
    const response = await apiRequest(
        "/reviews",
        {
            method: "POST",
            token,
            body: data
        }
    );

    return response;
}

export async function listAdminReviewsRequest(
    token,
    {
        search = "",
        estado = "PENDIENTE",
        destacada = "TODAS",
        page = 1,
        limit = 20,
        signal
    } = {}
) {
    const params = new URLSearchParams({
        search,
        estado,
        destacada,
        page: String(page),
        limit: String(limit)
    });
    const response = await apiRequest(
        `/admin/reviews?${params.toString()}`,
        {
            token,
            signal
        }
    );

    return response.data;
}

export async function moderateReviewRequest(
    token,
    reviewId,
    data
) {
    const response = await apiRequest(
        `/admin/reviews/${encodeURIComponent(reviewId)}`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );

    return response;
}
