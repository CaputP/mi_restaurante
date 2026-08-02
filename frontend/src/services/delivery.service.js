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

export async function getDeliveryOptionsRequest(
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
            `/deliveries/options${
                query ? `?${query}` : ""
            }`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getReadyOrdersRequest(
    token,
    {
        search = "",
        sucursalId = "",
        limit = 50,
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
        "limit",
        limit
    );

    const response =
        await apiRequest(
            `/deliveries/ready-orders?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function listDeliveriesRequest(
    token,
    {
        search = "",
        sucursalId = "",
        estado = "ACTIVAS",
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
            `/deliveries?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getDeliveryByIdRequest(
    token,
    deliveryId,
    signal
) {
    const response =
        await apiRequest(
            `/deliveries/${deliveryId}`,
            {
                token,
                signal
            }
        );

    return response.data.entrega;
}

export function createDeliveryRequest(
    token,
    orderId,
    data
) {
    return apiRequest(
        `/deliveries/orders/${orderId}`,
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export function pickupDeliveryRequest(
    token,
    deliveryId
) {
    return apiRequest(
        `/deliveries/${deliveryId}/pickup`,
        {
            method: "PATCH",
            token,
            body: {}
        }
    );
}

export function completeDeliveryRequest(
    token,
    deliveryId
) {
    return apiRequest(
        `/deliveries/${deliveryId}/complete`,
        {
            method: "PATCH",
            token,
            body: {}
        }
    );
}