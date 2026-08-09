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

export async function getOrderOptionsRequest(
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
            `/orders/options${
                query ? `?${query}` : ""
            }`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getOrderCustomerRewardsRequest(
    token,
    {
        sucursalId,
        clienteId,
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
    addParameter(
        params,
        "clienteId",
        clienteId
    );

    const response =
        await apiRequest(
            `/orders/customer-rewards?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function listOrdersRequest(
    token,
    {
        search = "",
        sucursalId = "",
        vendedorId = "",
        mozoId = "",
        estado = "TODOS",
        tipoPedido = "TODOS",
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
        "mozoId",
        mozoId
    );

    addParameter(
        params,
        "estado",
        estado
    );

    addParameter(
        params,
        "tipoPedido",
        tipoPedido
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
            `/orders?${params.toString()}`,
            {
                token,
                signal
            }
        );

    return response.data;
}

export async function getOrderByIdRequest(
    token,
    orderId,
    signal
) {
    const response =
        await apiRequest(
            `/orders/${orderId}`,
            {
                token,
                signal
            }
        );

    return response.data.pedido;
}

export function createOrderRequest(
    token,
    data
) {
    return apiRequest(
        "/orders",
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export function updateOrderRequest(
    token,
    orderId,
    data
) {
    return apiRequest(
        `/orders/${orderId}`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}

export function sendOrderRequest(
    token,
    orderId,
    data
) {
    return apiRequest(
        `/orders/${orderId}/send`,
        {
            method: "PATCH",
            token,
            body: data
        }
    );
}
