import { apiRequest } from "./api";

export async function listInventoryRequest(
    token,
    {
        search = "",
        sucursalId = "",
        tipoStock = "TODOS",
        soloAlertas = false,
        signal
    } = {}
) {
    const params = new URLSearchParams();

    if (search) {
        params.set("search", search);
    }

    if (sucursalId) {
        params.set(
            "sucursalId",
            sucursalId
        );
    }

    if (tipoStock) {
        params.set(
            "tipoStock",
            tipoStock
        );
    }

    params.set(
        "soloAlertas",
        String(soloAlertas)
    );

    const query = params.toString();

    const response = await apiRequest(
        `/admin/inventory${
            query ? `?${query}` : ""
        }`,
        {
            token,
            signal
        }
    );

    return response.data;
}

export async function createDailyStockRequest(
    token,
    data
) {
    return apiRequest(
        "/admin/inventory/daily-stock",
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export async function createInventoryMovementRequest(
    token,
    data
) {
    return apiRequest(
        "/admin/inventory/movements",
        {
            method: "POST",
            token,
            body: data
        }
    );
}

export async function listInventoryMovementsRequest(
    token,
    {
        search = "",
        sucursalId = "",
        productoSucursalId = "",
        tipoMovimiento = "TODOS",
        limit = 50,
        signal
    } = {}
) {
    const params = new URLSearchParams();

    if (search) {
        params.set("search", search);
    }

    if (sucursalId) {
        params.set(
            "sucursalId",
            sucursalId
        );
    }

    if (productoSucursalId) {
        params.set(
            "productoSucursalId",
            productoSucursalId
        );
    }

    if (tipoMovimiento) {
        params.set(
            "tipoMovimiento",
            tipoMovimiento
        );
    }

    params.set(
        "limit",
        String(limit)
    );

    const query = params.toString();

    const response = await apiRequest(
        `/admin/inventory/movements${
            query ? `?${query}` : ""
        }`,
        {
            token,
            signal
        }
    );

    return response.data;
}